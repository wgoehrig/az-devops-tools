import * as fs from "fs";
import * as path from "path";
import { runAzCommand } from "../utils/AzUtils";
import { startSpinner } from "../utils/MiscUtils";
import { printTable } from "../utils/TableUtils";

import chalk = require("chalk");

export const command = "get <sth>";
export const desc = "Get a set of service hooks";
export const builder = (yargs: import("yargs").Argv) => yargs
  .positional("sth", {
    describe: "Something to list service hooks of.",
    type: "string"
  });
export function handler(argv: any) { 
  getServiceHooks(argv); 
}

export async function getServiceHooks(argv: any) {
  console.log(argv);

  const spinner = startSpinner(chalk`Running {bold az pipelines variable-group list} ...`); 
  // https://dev.azure.com/<org>/_apis/hooks/consumers
  const checks = await runAzCommand([
    "devops",
    "invoke",
    "--route-parameters",
    "hubName=../../hooks/subscriptions",
    "--area", "distributedtask",
    "--resource", "hublicense",
    "--api-version", "6.1-preview",
    "--http-method", "GET",
    "--only-show-errors",
    "--in-file", JSON.stringify({
      "contributionIds": [
        "ms.vss-build-web.run-attempts-data-provider"
      ],
      // "dataProviderContext": {
      //   "properties": {
      //     "buildId": runId,
      //     "stageName": id,
      //     "sourcePage": {
      //       "routeId": "ms.vss-build-web.ci-results-hub-route",
      //       "routeValues": {
      //         "project": project,
      //       }
      //     }
      //   }
      // }
    })
  ], { inFile: true });
  spinner.stop();

  // console.log(checks.value);
  checks.value.map((i: any) => {
    console.log(chalk `{gray ${i.actionDescription}} by {blue ${i.createdBy.uniqueName}} to POST {green ${i.consumerInputs.url}} on event: {cyan ${i.eventDescription}}`);
  });
}
