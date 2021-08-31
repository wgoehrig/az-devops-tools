import * as get from "./get";
import * as edit from "./edit";
import * as create from "./create";
import * as create_init from "./create-init";
import yargs = require("yargs");
import chalk from "chalk";

export const command = "svc-hooks <command>";
export const desc = "Manage collections of related service hooks";
export function builder(yargs: import("yargs").Argv) {
  return yargs
    .updateStrings({"Commands:": chalk.cyan`Commands:`})
    .command(get)
    .command(edit)
    .command(create)
    .command(create_init);
}
export function handler(argv: import("yargs").Argv) {
  yargs.showHelp();
  console.error(chalk.bold.red`Unknown command: ${argv.command}`);
}