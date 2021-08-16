import * as get from "./get";
import yargs = require("yargs");
import chalk from "chalk";

export const command = "svc-hooks <command>"
export const desc = "Manage collections of related service hooks"
export function builder(yargs: import("yargs").Argv) {
  return yargs
    .updateStrings({"Commands:": chalk.cyan`Commands:`})
    .command(get)
}
export function handler(argv: import("yargs").Argv) {
  yargs.showHelp();
  console.error(chalk.bold.red`Unknown command: ${argv.command}`)
}