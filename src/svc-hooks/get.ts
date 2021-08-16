import * as fs from "fs";
import * as path from "path";
import { runAzCommand } from "../utils/AzUtils";
import { startSpinner } from "../utils/MiscUtils";
import { printTable } from "../utils/TableUtils";

import chalk = require("chalk");

export const command = "get <prefix>"
export const desc = "Get a set of service hooks";
export const builder = (yargs: import("yargs").Argv) => yargs
  .positional("prefix", {
    describe: "Common prefix for a set of variable groups.",
    type: "string"
  });
export function handler(argv: any) { getServiceHooks(argv.prefix); }

export async function getServiceHooks(prefix?: string) {
  const spinner = startSpinner(chalk`Running {bold az pipelines variable-group list} ...`);

  const checks = await runAzCommand([
    "devops",
    "invoke",
    // "--route-parameters", `project=${project}`,
    "--area", "hooks",
    "--resource", "subscriptions",
    "--http-method", "POST",
    "--api-version", "6.1-preview.1",
    // "--query-parameters", "$expand=1",
    "--only-show-errors",
    // "--in-file",
    JSON.stringify(svcConns)
  ], { inFile: true });
  spinner.stop();
  runAzCommand([

  ])

  // const groups: AzVarGroupJson[] = await runAzCommand([
  //   "pipelines",
  //   "variable-group",
  //   "list",
  //   "--only-show-errors",
  //   "--query",
  //   `sort_by([?contains(@.name, '${prefix}')],&name)`,
  // ]);
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