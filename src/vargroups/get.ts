import * as fs from "fs";
import * as path from "path";
import { runAzCommand } from "../utils/AzUtils";
import { startSpinner } from "../utils/MiscUtils";
import { printTable } from "../utils/TableUtils";
import { AzVarGroupJson, VarGroupCollection } from "./VarGroupCollection";
import chalk = require("chalk");
import { Argv } from "yargs";

export const command = "get <prefix>"
export const desc = "Get a set of variable groups";
export const builder = (yargs: Argv) => yargs
  .positional("prefix", {
    describe: "Common prefix for a set of variable groups.",
    type: "string"
  })
  .options({
    outDir: {
      alias: "o",
      describe: "Where to save YAML output.",
      type: "string"
    }
  });
export function handler(argv: any) { getVarGroups(argv.prefix, argv.outDir); }

export async function getVarGroups(prefix?: string, outDir?: string, silent = false) {
  const spinner = startSpinner(chalk`Running {bold az pipelines variable-group list} ...`);
  const groups: AzVarGroupJson[] = await runAzCommand([
    "pipelines",
    "variable-group",
    "list",
    "--only-show-errors",
    "--query",
    `"sort_by([?contains(@.name, '${prefix}')],&name)"`,
  ]);
  spinner.stop();

  const collection = new VarGroupCollection();
  collection.addGroups(prefix!, groups);

  if (!silent)
    printTable(collection);

  const yamlStr = collection.toString();
  if (outDir && !silent) {
    const filename = path.join(path.resolve(process.cwd(), outDir), `${prefix}.yaml`);
    fs.writeFileSync(filename, yamlStr);
    console.log();
    console.log(chalk.bold`YAML file saved to {cyan ${filename}}`);
  }

  return collection;
}