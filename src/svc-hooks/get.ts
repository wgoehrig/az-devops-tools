import * as fs from "fs";
import * as path from "path";
import { runAzCommand } from "../utils/AzUtils";
import { startSpinner } from "../utils/MiscUtils";
import { validEventTypes } from "./EventTypes";
import { HookData } from "./Types";
import { Argv } from "yargs";

const YAML = require("json2yaml");
import chalk from "chalk";

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
    .option("outDir", {
      alias: "o",
      default: ".",
      describe: "Directory to write output file to",
      type: "string",
      normalize: true,
    })
    .option("outType", {
      alias: "t",
      describe: "The type of output to write",
      choices: ["yaml", "json"],
      default: "yaml",
      type: "string",
    })
    .option("verbose", {
      // Allow the user to specify verbose mode
      alias: "v",
      demandOption: false,
      describe: "Verbose logging",
      type: "boolean",
    });

export async function handler(argv: any) {
  // Get existing service hooks
  const hooks = await getServiceHooks();

  // Filter by event type, if specified.
  let filtered = hooks.value;
  if (argv.event) {
    filtered = hooks.value.filter((i: HookData) => i.eventType === argv.event);
  }
  // Print the entire response in verbose mode.
  if (argv.verbose == true) {
    console.log(chalk.bold.red`Unfiltered`, hooks);
    console.log(chalk.bold.red`Filtered`, filtered);
  } else {
    filtered.map((i: HookData) => {
      console.log(
        chalk`{gray ${i.actionDescription}} by {blue ${i.createdBy.uniqueName}} on event {cyan ${i.eventDescription} }{magenta > }{cyan ${i.eventType}} to POST {green ${i.consumerInputs.url}}`
      );
    });
  }

  // Write the output to file
  const fPath = path.join(
    argv.outDir,
    `get${argv.event ? `_${argv.event}` : ""}.${
      argv.outType === "yaml" ? "yml" : "json"
    }`
  );
  if (!fs.existsSync(argv.outDir)) {
    fs.mkdirSync(argv.outDir);
  }
  if (argv.outType === "yaml") {
    fs.writeFileSync(fPath, YAML.stringify(filtered));
  } else {
    fs.writeFileSync(fPath, JSON.stringify(filtered, null, 2));
  }
}

export async function getServiceHooks() {
  /* GET request to https://dev.azure.com/<org>/_apis/hooks/consumers
  SUPER DUPER HACKY
  */
  const spinner = startSpinner(
    chalk`Requesting all service hooks via {bold az devops invoke} ...`
  );
  const hooks = await runAzCommand(
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

  return hooks;
}
