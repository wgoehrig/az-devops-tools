import chalk from "chalk";
import ora from "ora";

export function startSpinner(text: string) {
  return ora({
    text,
    discardStdin: false // Without this, promptToConfirm is broken!
  }).start();
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

export type YargsArgv<T extends (...args: any) => any> = ReturnType<T>["argv"] & { command?: string };