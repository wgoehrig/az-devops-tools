import * as fs from "fs";
import { runAzCommand } from "../utils/AzUtils";
import { startSpinner } from "../utils/MiscUtils";
import { validEventTypes } from "./eventTypes";


export const command = "edit <command>";
export const desc = "Edit a set of service hooks. Use svc-hooks get to generate starter";
export const builder = (yargs: import("yargs").Argv) =>
  yargs
    .option("file", {
      alias: "F",
      default: "get.yaml",
      describe: "Directory to write output file to",
      type: "string",
      normalize: true
    });

export function handler(argv: any) {
  console.log("TO BE IMPLEMENTED", argv);
}