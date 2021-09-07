import chalk from "chalk";
import * as child_process from "child_process";
import * as ini from "ini";
import * as os from "os";
import * as path from "path";
import * as fs from "fs";
import * as util from "util";
import which from "which";
import workerFarm from "worker-farm";
import { startSpinner } from "./MiscUtils.js";
import { v4 as uuidv4 } from "uuid";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore 
import { quoteForShell } from "puka";
const execFile = util.promisify(child_process.execFile);
const writeFile = util.promisify(fs.writeFile);
const unlink = util.promisify(fs.unlink);

interface AzOptions {
  parseJson: boolean;
  inFile: boolean; // if true, assumes last arg should be saved to file & replaced w/ path
}

const defaultAzOptions: AzOptions = {
  parseJson: true,
  inFile: false,
};

export async function runAzParallel(argSets: string[][], options: Partial<AzOptions>={}): Promise<any[]> {
  const spinner = startSpinner(chalk`Running {bold ${argSets.length}} az commands on {bold ${Math.min(os.cpus().length, argSets.length)}} threads`);

  // FIXME: This is a hack to get around the fact that worker-farm doesn't support ES modules.
  const loaderPath = path.join(os.tmpdir(), `az-devops-tools-${uuidv4()}.loader.cjs`);
  await writeFile(loaderPath, `module.exports = { runAzInWorker: async (...args) => (await import(${JSON.stringify(import.meta.url)})).runAzInWorker(...args) };`);

  const workers = workerFarm({ maxRetries: 0, }, loaderPath, ["runAzInWorker"]);
  const promises: Promise<any>[] = [];
  for (const args of argSets) {
    promises.push(new Promise((resolve, reject) => {
      workers.runAzInWorker(args, options, (retVal: any) => (retVal instanceof Error) ? reject(retVal) : resolve(retVal));
    }));

    // FIXME: Somehow, the az devops extension can fail silently when running too many concurrent threads.
    // See: https://github.com/Azure/azure-devops-cli-extension/issues/1101
    // Hopefully this gets fixed soon, but in the meantime this seems like enough of a delay to avoid that...
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  let result: any[] = [];
  try {
    result = await Promise.all(promises);
    spinner.stop();
  } catch (error) {
    spinner.stop();
    await new Promise((resolve) => workerFarm.end(workers, resolve));
    console.error(error.message);
    process.exit(1);
  }
  workerFarm.end(workers);
  await unlink(loaderPath);
  return result;
}

let azPath: string;
async function _runAz(args: string[], options: Partial<AzOptions>={}): Promise<any | Error> {
  const opts: AzOptions = { ...defaultAzOptions, ...options };

  // This is needed to fix a bunch of issues when using TCC/bash/etc on windows.
  // Basically guarantees that execFile will alway use regular old CMD to spawn az.
  if (process.platform === "win32")
    process.env.COMSPEC = "cmd.exe";

  if (opts.inFile) {
    const inFilePath = path.join(os.tmpdir(), `az-devops-tools-${uuidv4()}.tmpinfile.json`);
    await writeFile(inFilePath, args[args.length-1]);
    args[args.length-1] = inFilePath;
  }

  try {
    const execOptions = { windowsVerbatimArguments: true, shell: true, maxBuffer: 48 * 2048 * 1024 } as child_process.ExecFileOptions;
    let azResult: { stdout: string, stderr: string};
    try {
      azResult = await execFile(`"${azPath}"`, args.map((v) => quoteForShell(v)), execOptions);
    } catch (error) {
      return error;
    }
    const stderr = azResult.stderr.toString().trim();
    const azOutput = azResult.stdout.toString();
    try {
      const val = (opts.parseJson) ? JSON.parse(azOutput) : azOutput;
      if (stderr)
        console.error(chalk.yellow(stderr));
      return val;
    } catch (error) {
      return new Error(chalk`{yellow ${stderr}}\n{dim ${azOutput}}\n{red ERROR: az did not return valid JSON!}`);
    }
  } finally {
    if (opts.inFile)
      await unlink(args[args.length-1]);
  }
}

export async function runAzCommand(args: string[], options: Partial<AzOptions>={}): Promise<any> {
  const res = await _runAz(args, options);
  if (res instanceof Error) {
    console.error(res.message);
    process.exit(1);
  }
  return res;
}

export async function runAzInWorker(args: string[], options: Partial<AzOptions>={}, callback: (v: any) => void): Promise<any> {
  azPath = which.sync("az");
  callback(await _runAz(args, options));
}

let azConfig: [org: string, project: string];
export function getAzConfig() {
  if (!azConfig) {
    const extensionPath = path.join(os.homedir(), ".azure/cliextensions/azure-devops");
    const configPath = path.join(os.homedir(), ".azure/azuredevops/config");
    if (!fs.existsSync(extensionPath)) {
      console.log(chalk.red`You are missing the {bold azure-devops} az extension!`);
      console.log(chalk.red`Try running: {bold.yellow az extension add --name azure-devops}`);
      process.exit(1);
    }
    
    let config: any;
    if (fs.existsSync(configPath)) {
      try {
        config = ini.parse(fs.readFileSync(configPath).toString());
      } catch {}
    }

    if (!config?.defaults?.organization || !config?.defaults?.project) {
      console.log(chalk.red`Your devops organization/project is not configured!`);
      console.log(chalk.red`Try running: {bold.yellow az devops configure --defaults organization=... project=... }`);
      process.exit(1);
    }
    azConfig = [config?.defaults?.organization, config?.defaults?.project];
  }
  return azConfig;
}

export function checkAz(): void {
  try {
    azPath = which.sync("az");
  } catch (error) {
    console.log(chalk.red`Error: az-devops-tools requires {bold az}, the Azure CLI.`);
    console.log(chalk.red`Visit {bold.blue.underline https://aka.ms/installazcli} for installation instructions.`);
    process.exit(1);
  }

  getAzConfig();
}