import * as fs from "fs";
import { join } from "path";
import * as YAML from "yaml";
import { validEventTypes } from "./EventTypes";
import { getServiceHooks } from "./get";
import { HookData, HookFormattedData } from "./Types";

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
      "resourceVersion": "5.1-preview.1",
      // Don't include scope: 1 here, it's hardcoded in the Azure API.
    });
  });

  // Write data to output file
  const fPath = join(argv.outDir, `edit.yaml`);
  if (!fs.existsSync(argv.outDir)) {
    fs.mkdirSync(argv.outDir);
  }
  fs.writeFileSync(fPath, YAML.stringify(hooksFormatted));
}
