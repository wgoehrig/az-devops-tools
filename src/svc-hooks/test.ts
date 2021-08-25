/* eslint-disable no-case-declarations */
/* eslint-disable @typescript-eslint/no-unused-vars */
// https://docs.microsoft.com/en-us/azure/devops/service-hooks/create-subscription?view=azure-devops#create-a-subscription-for-a-org

import * as fs from "fs";
import { runAzCommand } from "../utils/AzUtils";
import { startSpinner } from "../utils/MiscUtils";
import { validEventTypes } from "./eventTypes";
const prompts = require("prompts");

import chalk = require("chalk");

export const command = "test";
export const desc = "test";
export const builder = (yargs: import("yargs").Argv) =>
  yargs.option("hi", { describe: "hi" }); // Headers and file are mutually exclusive.

export async function handler(argv: any) {
  // Search the orgId of the org we'd like to create a hook for.
  // az devops invoke --area core --resource projects --organization https://dev.azure.com/bentleycs --api-version=6.1-preview
  const spinner = startSpinner(
    chalk`Finding your config via {bold az devops configure -l} ...`
  );
  const result = await runAzCommand(["devops", "configure", "-l"]);
  spinner.stop();

  console.log(result.split()[0]);
  console.log(argv);
}
