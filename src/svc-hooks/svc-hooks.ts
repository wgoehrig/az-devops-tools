import chalk from "chalk";
import * as create from "./create.js";
import * as create_init from "./create-init.js";
import * as edit from "./edit.js";
import * as edit_init from "./edit-init.js";
import * as get from "./get.js";
import { YargsArgv } from "../utils/MiscUtils.js";

export const command = "svc-hooks <command>";
export const desc = "Manage collections of related service hooks";

let yargs: import("yargs").Argv;

export function builder(yargsInstance: import("yargs").Argv) {
  yargs = yargsInstance;
  return yargsInstance
    .updateStrings({ "Commands:": chalk.cyan`Commands:` })
    .command(get)
    .command(edit_init)
    .command(edit)
    .command(create_init)
    .command(create);
}
export function handler(argv: YargsArgv<typeof builder>) {
  yargs.showHelp();
  console.error(chalk.bold.red`Unknown command: ${argv.command}`);
}