import chalk = require("chalk");
import * as child_process from "child_process";
import * as os from "os";
import * as util from "util";
import * as ora from "ora";
import * as which from "which";
import * as workerFarm from "worker-farm";
const execFile = util.promisify(child_process.execFile);

// This is needed to fix a bunch of issues when using TCC/bash/etc on windows.
// Basically guarantees that execFile will alway use regular old CMD to spawn az.
if (process.platform === "win32")
  process.env.COMSPEC = "cmd.exe";

export async function runAzParallel(argSets: string[][]): Promise<any[]> {
  const spinner = ora(chalk`Running {bold ${argSets.length}} az commands on {bold ${os.cpus().length}} threads`).start();
  const workers = workerFarm({maxRetries: 0}, __filename, ["runAzInWorker"]);
  let promises: Promise<any>[] = [];
  for (const args of argSets) {
    promises.push(new Promise((resolve, reject) => {
      workers.runAzInWorker(args, (retVal: any) => (retVal instanceof Error) ? reject(retVal) : resolve(retVal));
    }));
  }
  
  let result: any[] = [];
  try {
    result = await Promise.all(promises);
    spinner.stop();
  } catch (error) {
    spinner.stop();
    console.error(error.message);
    workerFarm.end(workers);
    process.exit(1);
  }
  workerFarm.end(workers);
  return result;
}

const azPath = which.sync("az");
async function _runAz(args: string[]): Promise<any | Error> {
  const options = { windowsVerbatimArguments: true, shell: true } as child_process.ExecFileOptions;
  const azResult = await execFile(`"${azPath}"`, args, options);
  const stderr = azResult.stderr.toString().trim();
  const azOutput = azResult.stdout.toString();
  try {
    const val = JSON.parse(azOutput);
    if (stderr)
      console.error(chalk.yellow(stderr))
    return val
  } catch (error) {
    return new Error(chalk`{yellow ${stderr}}\n{dim ${azOutput}}\n{red ERROR: az did not return valid JSON!}`);
  }
}

export async function runAzCommand(args: string[]): Promise<any> {
  const res = await _runAz(args);
  if (res instanceof Error) {
    console.error(res.message);
    process.exit(1);
  }
  return res;
}

export async function runAzInWorker(args: string[], callback: (v: any) => void): Promise<any> {
  callback(await _runAz(args));
}

async function onAnyKey() {
  process.stdin.setRawMode!(true);
  const key = await new Promise((resolve) => {
    process.stdin.once("data", resolve);
  });
  process.stdin.pause();
  return key as string;
}

export async function promptToConfirm() {
  console.log(chalk.bold`Press {cyan Y} to continue`);
  const key = await onAnyKey();
  if (key.toString().toUpperCase() !== "Y") {
    console.error(chalk.bold.red`Aborted.`);
    process.exit(1);
  }
}
