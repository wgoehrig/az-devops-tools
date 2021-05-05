import * as copyChecks from "./copy-checks";
import { Argv } from "yargs";

export const command = "svc-conns <command>"
export const desc = "Manage collections of related service connections"
export function builder(yargs: Argv) {
  return yargs
    .command(copyChecks)
}
export function handler(_argv: Argv) {}