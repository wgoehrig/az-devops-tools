import * as fs from "fs";
import * as path from "path";
import { runAzCommand } from "../utils/AzUtils";
import { startSpinner } from "../utils/MiscUtils";
import { printTable } from "../utils/TableUtils";

import chalk = require("chalk");

export const command = "get";
export const desc = "Get a set of service hooks";
export const builder = (yargs: import("yargs").Argv) =>
  yargs.option("verbose", {
    // Allow the user to specify verbose mode
    alias: "v",
    demandOption: false,
    describe: "Verbose logging",
    type: "boolean",
  });
export function handler(argv: any) {
  getServiceHooks(argv);
}

export async function getServiceHooks(argv: any) {
  /* GET request to https://dev.azure.com/<org>/_apis/hooks/consumers
  SUPER DUPER HACKY
  */
  const spinner = startSpinner(chalk`Running {bold az devops invoke} ...`);
  const checks = await runAzCommand(
    [
      "devops",
      "invoke",
      "--route-parameters",
      "hubName=../../hooks/subscriptions",
      "--area",
      "distributedtask",
      "--resource",
      "hublicense",
      "--api-version",
      "6.1-preview",
      "--http-method",
      "GET",
      "--only-show-errors",
      "--in-file",
      JSON.stringify({
        contributionIds: ["ms.vss-build-web.run-attempts-data-provider"],
      }),
    ],
    { inFile: true }
  );
  spinner.stop();

  // Print the entire response in verbose mode.
  if (argv.verbose == true) {
    console.log(checks.value);
  } else {
    checks.value.map((i: any) => {
      console.log(
        chalk`{gray ${i.actionDescription}} by {blue ${i.createdBy.uniqueName}} on event {cyan ${i.eventDescription}} to POST {green ${i.consumerInputs.url}}`
      );
    });
  }

  console.log(argv.verbose);
}
