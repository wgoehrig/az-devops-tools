import * as fs from "fs";
import * as path from "path";
import { runAzCommand, runAzParallel } from "./utils/AzUtils";
import { promptToConfirm, startSpinner } from "./utils/MiscUtils";
import { printTable } from "./utils/TableUtils";
import { AzVarGroupJson, rawValue, SecretVal, VarGroupCollection } from "./vargroups/VarGroupCollection";
import { findChanges, printChangeSummary } from "./vargroups/VarGroupEditing";
import chalk = require("chalk");
require("source-map-support").install();
require('yargonaut')
  .style('green')
  .style('yellow', "required")
  .style('cyan', "Positionals:")
  .helpStyle('cyan')
  .errorsStyle('red.bold');
import yargs = require("yargs");
import ora = require("ora");

// tslint:disable: no-console
yargs.strict(true)
  .wrap(Math.min(150, yargs.terminalWidth()))
  .version("2.0.0")
  .usage("Azure DevOps Tools\n\n Tools to make certain tasks suck less.")
  .command("get-vg <prefix>", "Get a set of variable groups",
    function (yargs) {
      return yargs.positional('prefix', {
        describe: 'Common prefix for a set of variable groups',
        type: 'string'
      }).options({
        "outDir": {
          alias: "o",
          describe: "Where to save YAML output.",
          type: "string"
        }
      });
    },
    (argv) => { getVarGroups(argv.prefix, argv.outDir) })
  .command("update-vg <prefix> <yaml>", "Update a set of variable groups",
    function (yargs) {
      return yargs.positional('prefix', {
        describe: 'Common prefix for a set of variable groups',
        type: 'string',
      }).positional("yaml", {
        describe: "Path of updated YAML file.",
        type: "string"
      });
    },
    (argv) => { updateVarGroups(argv.prefix!, argv.yaml!) })
  .help()
  .demandCommand()
  .argv;

async function getVarGroups(prefix?: string, outDir?: string, silent = false) {
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
    console.log(chalk.bold(`YAML file saved to ${chalk.cyan(filename)}`));
  }

  return collection;
}

async function updateVarGroups(prefix: string, yamlFile: string) {
  const currentVals = await getVarGroups(prefix, undefined, true);
  const newVals = VarGroupCollection.fromYaml(fs.readFileSync(yamlFile).toString());

  const changes = findChanges(currentVals, newVals);
  printChangeSummary(changes);

  if (changes.changedVars.length === 0 && changes.newGroups.length === 0) {
    console.log(chalk.bold`Nothing to change - everything is up to date!`);
    return;
  }

  await promptToConfirm();

  // az pipelines variable - group variable update--id 899 --name BILLTEST--value foo--secret false --only - show - errors - o none

  for (const g of changes.newGroups) {
    const description = (g.description === undefined || g.description === null) ? [] : ["--description", g.description];
    const variables = g.variables
      .filter(([_n, value]) => !(value instanceof SecretVal))
      .map(([name, value]) => `${name}=${value}`);

    const group = await runAzCommand([
      "pipelines",
      "variable-group",
      "create",
      "--only-show-errors",
      "--variables", ...variables,
      "--name",
      g.name,
      ...description,
    ]);

    // // TODO...
    // if ()
    // for (const [name, value] of g.variables) {
    //   if (value instanceof SecretVal)
    //     await runAzCommand([
    //       "pipelines",
    //       "variable-group",
    //       "variable",
    //       "create",
    //       "--only-show-errors",
    //       "--id",
    //       `${v.groupId}`,
    //       "--name",
    //       v.varName,
    //       "--value",
    //       rawValue(v.newValue)!,
    //       "--secret",
    //       "true",
    //     ]);
    // }
  }

  await runAzParallel(changes.changedVars.map((v) => [
    "pipelines",
    "variable-group",
    "variable",
    (v.oldValue === undefined) ? "create" : "update",
    "--only-show-errors",
    "--id",
    `${v.groupId}`,
    "--name",
    v.varName,
    "--value",
    rawValue(v.newValue)!,
    "--secret",
    `${v.newValue instanceof SecretVal}`,
  ]));
  console.log(chalk.bold`Variable groups updated successfully!`);
}