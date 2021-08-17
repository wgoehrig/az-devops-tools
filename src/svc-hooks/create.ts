// https://docs.microsoft.com/en-us/azure/devops/service-hooks/create-subscription?view=azure-devops#create-a-subscription-for-a-project


import * as fs from "fs";
import * as path from "path";
import { runAzCommand } from "../utils/AzUtils";
import { startSpinner } from "../utils/MiscUtils";
import { printTable } from "../utils/TableUtils";

import chalk = require("chalk");

export const command = "create <args>";
export const desc = "Create a service hook";
export const builder = (yargs: import("yargs").Argv) => yargs
  .positional("args", {
    describe: "some args to be determined later.",
    type: "string"
  });
export function handler(argv: any) { 
  // crateServiceHooks(argv.prefix); 
  console.log(argv);
}

// export async function createServiceHook(prefix?: string) {
//     console.log("TO BE IMPLEMENTED");
// }
