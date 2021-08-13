import * as get from "./get";
import { Argv } from "yargs";

export const command = "logs <command>"
export const desc = "Manage pipeline logs"
export function builder(yargs: Argv) {
  return yargs
    .command(get)
}
export function handler(_argv: Argv) {}
