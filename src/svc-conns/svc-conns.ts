import * as copyChecks from "./copy-checks";
import yargs = require("yargs");
import chalk from "chalk";

export const command = "svc-conns <command>";
export const desc = "Manage collections of related service connections";
export function builder(yargs: import("yargs").Argv) {
  return yargs
    .updateStrings({"Commands:": chalk.cyan`Commands:`})
    .command(copyChecks);
}
export function handler(argv: import("yargs").Argv) {
  yargs.showHelp();
  console.error(chalk.bold.red`Unknown command: ${argv.command}`);
}