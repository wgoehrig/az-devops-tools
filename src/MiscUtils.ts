import chalk = require("chalk");
import { spawnSync } from "child_process";
import * as which from "which";

let azPath: string;

export function runAzCommand(args: string[]): any {
  azPath = azPath ?? which.sync("az");
  const azResult = spawnSync(`"${azPath}"`, args, { shell: true });
  if (azResult.stderr.toString().length > 1)
    console.error(azResult.stderr.toString());
  const azOutput = azResult.stdout.toString();
  try {
    return JSON.parse(azOutput);
  } catch (error) {
    console.error(azOutput);
    console.error("ERROR: az did not return valid JSON!");
    process.exit(1);
  }
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
    console.error("Aborted.");
    process.exit(1);
  }
}
