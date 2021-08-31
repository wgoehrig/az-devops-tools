import * as fs from "fs";
import { join } from "path";
import { validEventTypes } from "./EventTypes";
import { getServiceHooks } from "./get";
import { HookData, HookFormattedData } from "./Types";
import { Argv } from "yargs";

const YAML = require("json2yaml");

export const command = "edit-init";
export const desc = "Initialize the YAML file for editing service hooks";
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
      default: "yaml",
      describe: "Output file type",
      type: "string",
      choices: ["yaml", "json"],
    });
export async function handler(argv: any) {
  // Get existing service hooks
  const hooks = await getServiceHooks();

  // Filter by event type, if specified.
  let filtered = hooks.value;
  if (argv.event) {
    filtered = hooks.value.filter((i: HookData) => i.eventType === argv.event);
  }

  // Format existing hook data
  const hooksFormatted: HookFormattedData[] = [];
  filtered.map((hook: HookData) => {
    hooksFormatted.push({
      consumerActionId: hook.consumerActionId,
      consumerId: hook.consumerId,
      consumerInputs: hook.consumerInputs,
      eventType: hook.eventType,
      id: hook.id,
      publisherId: hook.publisherId,
      publisherInputs: hook.publisherInputs,
      resourceVersion: "1.0",
      // Don't include scope: 1 here, it's hardcoded in the Azure API.
    });
  });

  // Write data to output file
  const fPath = join(
    argv.outDir,
    `edit.${argv.outType === "yaml" ? "yml" : "json"}`
  );
  if (!fs.existsSync(argv.outDir)) {
    fs.mkdirSync(argv.outDir);
  }
  if (argv.outType === "yaml") {
    fs.writeFileSync(fPath, YAML.stringify(hooksFormatted));
  } else {
    fs.writeFileSync(fPath, JSON.stringify(hooksFormatted, null, 2));
  }
}