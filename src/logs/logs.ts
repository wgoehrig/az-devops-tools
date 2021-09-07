import * as get from "./get.js";
import chalk from "chalk";
import { YargsArgv } from "../utils/MiscUtils.js";

export const command = "logs <command>"
export const desc = "Manage pipeline logs"
let yargs: import("yargs").Argv;

export function builder(y: import("yargs").Argv) {
  yargs = y;
  return y
    .updateStrings({"Commands:": chalk.cyan`Commands:`})
    .command(get);
}

export function handler(argv: YargsArgv<typeof builder>) {
  yargs.showHelp();
  console.error(chalk.bold.red`Unknown command: ${argv.command}`)
}
