import * as fs from "fs";
import { runAzCommand, runAzParallel } from "../utils/AzUtils";
import { startSpinner } from "../utils/MiscUtils";
import { validEventTypes } from "./eventTypes";

import { HookFormattedData } from "./Types";

import chalk = require("chalk");
const JS = require("js-yaml");

export const command = "edit <file>";
export const desc =
  "Edit a set of service hooks. Use svc-hooks edit-init to generate starter";
export const builder = (yargs: import("yargs").Argv) =>
  yargs.positional("file", {
    alias: "F",
    describe: "File path containing existing service hooks to be updated",
    type: "string",
    normalize: true,
  });

export async function handler(argv: any) {
  // Open and read service hook from file
  const file = argv.file;
  const fileType = argv.file.split(".").pop().toLowerCase();
  const fileContents = fs.readFileSync(file, "utf8");

  // Parse service hook file contents
  let hookData: [];
  if (fileType === "json") {
    hookData = JSON.parse(fileContents);
  } else if (fileType === "yml") {
    hookData = JS.load(fileContents);
  } else {
    console.error(chalk.red("Invalid file type"));
    throw new Error(chalk.red("Invalid file type"));
  }

  console.log(hookData);
  

  // Prepare our az commands.
  const azCommands: string[][] = [];
  await Promise.all(hookData.map(async (hook: HookFormattedData) => {
    // Check if hook data is missing any data
    if (!hook.consumerActionId || !hook.consumerId || !hook.consumerInputs || !hook.eventType || !hook.id || !hook.publisherId || !hook.publisherInputs || !hook.resourceVersion) {  
      throw new Error(chalk.red("Missing data in file"));
    }

    const hookDataFormatted: any = hook;
    hookDataFormatted.scope = "1.0";
    
    azCommands.push([
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
      "PUT",
      "--only-show-errors",
      "--in-file",
      JSON.stringify(hookDataFormatted),
    ]);
  }));

   // Start updating webhooks
   console.log("azCommands", azCommands);
   const spinner = startSpinner(
     chalk`Updating ${azCommands.length} service hooks...via {bold az devops invoke}`
   );
   await runAzParallel(azCommands, { inFile: true });
   spinner.stop();
}
