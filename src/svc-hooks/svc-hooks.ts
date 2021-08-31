import chalk from "chalk";
import * as create from "./create";
import * as create_init from "./create-init";
import * as edit from "./edit";
import * as edit_init from "./edit-init";
import * as get from "./get";
import yargs = require("yargs");

export const command = "svc-hooks <command>";
export const desc = "Manage collections of related service hooks";
export function builder(yargs: import("yargs").Argv) {
  return yargs
    .updateStrings({ "Commands:": chalk.cyan`Commands:` })
    .command(get)
    .command(edit)
    .command(edit_init)
    .command(create)
    .command(create_init);
}
export function handler(argv: any) {
  yargs.showHelp();
  console.error(chalk.bold.red`Unknown command: ${argv.command}`);
}
