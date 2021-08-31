import * as fs from "fs";
import { runAzParallel } from "../utils/AzUtils";
import { startSpinner } from "../utils/MiscUtils";
import { HookFormattedData } from "./Types";
import { Argv } from "yargs";
import chalk from "chalk";
import * as YAML from "yaml";
import { extname } from "path";

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
  const fileContents = fs.readFileSync(file, "utf8");

  // Parse service hook file contents
  const hookData: HookFormattedData[] = YAML.parse(fileContents);

  const spinner = startSpinner("Preparing service hooks and looking up any missing required data...");
  // Prepare our az commands.
  const azCommands: string[][] = [];
  await Promise.all(
    hookData.map(async (hook: HookFormattedData) => {
      // Check if hook data is missing any data
      if (
        !hook.consumerActionId ||
        !hook.consumerId ||
        !hook.consumerInputs ||
        !hook.eventType ||
        !hook.id ||
        !hook.publisherId ||
        !hook.publisherInputs ||
        !hook.resourceVersion
      ) {
        throw new Error("Missing data in file");
      }

      // Add the scope property, hardcoded in Azure API.
      const hookDataFormatted: any = hook; // The type should be HookFormattdData with a .scope property.
      hookDataFormatted.scope = "1.0";

      // Add command to azCommands, so we can run it in parallel later
      // PUT request to https://dev.azure.com/<org>/_apis/hooks/subscription 
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
    })
  );
  spinner.stop();

  // Start updating webhooks
  spinner.text = chalk`Updating ${azCommands.length} service hooks...via {bold az devops invoke}`;
  await runAzParallel(azCommands, { inFile: true });
  spinner.stop();
}
