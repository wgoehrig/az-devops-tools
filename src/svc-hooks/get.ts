import * as fs from "fs";
import { runAzCommand } from "../utils/AzUtils";
import { startSpinner } from "../utils/MiscUtils";
import { validEventTypes } from "./eventTypes";

const YAML = require("json2yaml");
import chalk = require("chalk");

export const command = "get";
export const desc = "Get a set of service hooks";
export const builder = (yargs: import("yargs").Argv) =>
  yargs
    .option("event", {
      alias: "e",
      choices: validEventTypes,
      demandOption: false,
      describe: "The type of event to get hooks for",
    })
    .option("file", {
      alias: "F",
      default: "get.yml",
      describe: "File to write the output to",
      type: "string",
    })
    .option("verbose", {
      // Allow the user to specify verbose mode
      alias: "v",
      demandOption: false,
      describe: "Verbose logging",
      type: "boolean",
    })
    .normalize("file");
export function handler(argv: any) {
  getServiceHooks(argv);
}

export async function getServiceHooks(argv: any) {
  /* GET request to https://dev.azure.com/<org>/_apis/hooks/consumers
  SUPER DUPER HACKY
  */
  const spinner = startSpinner(
    chalk`Requesting all service hooks via {bold az devops invoke} ...`
  );
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

  // Filter by event type, if specified.
  let filtered = checks.value;
  if (argv.event) {
    filtered = checks.value.filter((i: any) => i.eventType === argv.event);
  }
  // Print the entire response in verbose mode.
  if (argv.verbose == true) {
    console.log(filtered);
  } else {
    filtered.map((i: any) => {
      console.log(
        chalk`{gray ${i.actionDescription}} by {blue ${i.createdBy.uniqueName}} on event {cyan ${i.eventDescription} }{magenta > }{cyan ${i.eventType}} to POST {green ${i.consumerInputs.url}}`
      );
    });
  }

  // Write the output to a specific file.
  if (argv.file) {
    fs.writeFileSync(argv.file, YAML.stringify(filtered));
  }
}
