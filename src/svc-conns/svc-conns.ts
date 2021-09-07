import * as copyChecks from "./copy-checks.js";
import chalk from "chalk";
import { YargsArgv } from "../utils/MiscUtils.js";

export const command = "svc-conns <command>";
export const desc = "Manage collections of related service connections";
let yargs: import("yargs").Argv;

export function builder(y: import("yargs").Argv) {
  yargs = y;
  return y.updateStrings({"Commands:": chalk.cyan`Commands:`})
    .command(copyChecks);
}

export function handler(argv: YargsArgv<typeof builder>) {
  yargs.showHelp();
  console.error(chalk.bold.red`Unknown command: ${argv.command}`);
}