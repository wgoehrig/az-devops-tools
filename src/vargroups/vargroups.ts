import * as get from "./get.js";
import * as apply from "./apply.js";
import * as auth from "./auth.js";
import chalk from "chalk";
import { YargsArgv } from "../utils/MiscUtils.js";

export const command = "vargroups <command>"
export const desc = "Manage collections of related pipeline variable groups"

let yargs: import("yargs").Argv;

export function builder(yargsInstance: import("yargs").Argv) {
  yargs = yargsInstance;
  return yargsInstance.updateStrings({"Commands:": chalk.cyan`Commands:`})
    .command(get)
    .command(apply)
    .command(auth);
}

export function handler(argv: YargsArgv<typeof builder>) {
  yargs.showHelp();
  console.error(chalk.bold.red`Unknown command: ${argv.command}`);
}