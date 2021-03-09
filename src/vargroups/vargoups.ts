import * as get from "./get";
import * as apply from "./apply";
import * as auth from "./auth";
import { Argv } from "yargs";

export const command = "vargroups <command>"
export const desc = "Manage collections of related pipeline variable groups"
export function builder(yargs: Argv) {
  return yargs
    .command(get)
    .command(apply)
    .command(auth)
}
export function handler(_argv: Argv) {}