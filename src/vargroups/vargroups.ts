import * as get from "./get";
import * as apply from "./apply";
import * as auth from "./auth";
import yargs = require("yargs");
import chalk from "chalk";

export const command = "vargroups <command>";
export const desc = "Manage collections of related pipeline variable groups";
export function builder(yargs: import("yargs").Argv) {
  return yargs
    .updateStrings({"Commands:": chalk.cyan`Commands:`})
    .command(get)
    .command(apply)
    .command(auth);
}
export function handler(argv: import("yargs").Argv) {
  yargs.showHelp();
  console.error(chalk.bold.red`Unknown command: ${argv.command}`);
}