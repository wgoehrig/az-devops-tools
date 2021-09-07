import * as fs from "fs";
import { getVarGroups } from "./get.js";
import { runAzCommand, runAzParallel } from "../utils/AzUtils.js";
import { promptToConfirm } from "../utils/MiscUtils.js";
import { isDeleted, rawValue, SecretVal, VarGroupCollection } from "./VarGroupCollection.js";
import { findChanges, printChangeSummary } from "./VarGroupEditing.js";
import chalk from "chalk";

export const command = "apply <yaml>";
export const desc = "Update a set of variable groups";
export const builder = (yargs: import("yargs").Argv) =>
  yargs.positional("yaml", {
    describe: "Path of updated YAML file.",
    type: "string"
  });
export function handler(argv: any) { updateVarGroups(argv.yaml); }

async function updateVarGroups(yamlFile: string) {
  const newVals = VarGroupCollection.fromYaml(fs.readFileSync(yamlFile).toString());
  const prefix = newVals.prefix;
  if (!prefix) {
    console.log(chalk.bold`Nothing to change - yaml file does not contain any variable groups.`);
    return;
  }

  const currentVals = await getVarGroups(prefix, undefined, true);
  const changes = findChanges(currentVals, newVals);
  printChangeSummary(changes);

  if (changes.changedVars.length === 0 && changes.newGroups.length === 0) {
    console.log(chalk.bold`Nothing to change - everything is up to date!`);
    return;
  }

  await promptToConfirm();

  for (const g of changes.newGroups) {
    const description = (g.description === undefined || g.description === null) ? [] : ["--description", g.description];
    const variables = g.variables
      .filter(([_n, value]) => !(value instanceof SecretVal || isDeleted(value) || value === undefined))
      .map(([name, value]) => `${name}=${JSON.stringify(value)}`);

    const group = await runAzCommand([
      "pipelines",
      "variable-group",
      "create",
      "--only-show-errors",
      "--variables", ...variables,
      "--name",
      JSON.stringify(g.name),
      ...description,
    ]);

    const azCommands: string[][] = [];
    for (const [name, value] of g.variables) {
      const raw = rawValue(value);
      if (value instanceof SecretVal && raw !== null && !isDeleted(raw))
        azCommands.push([
          "pipelines",
          "variable-group",
          "variable",
          "create",
          "--only-show-errors",
          "--id",
          `${group.id}`,
          "--name",
          name,
          "--value",
          raw,
          "--secret",
          "true",
        ]);
    }
    await runAzParallel(azCommands);
  }

  await runAzParallel(changes.changedVars.map((v) => {
    const commonOptions = [
      "--only-show-errors",
      "--id",
      `${v.groupId}`,
      "--name",
      v.varName,
    ];

    const newVal = rawValue(v.newValue);
    if (isDeleted(newVal)) {
      return [
        "pipelines",
        "variable-group",
        "variable",
        "delete",
        ...commonOptions,
        "--yes"
      ];
    }

    return [
      "pipelines",
      "variable-group",
      "variable",
      (v.oldValue === undefined) ? "create" : "update",
      ...commonOptions,
      "--value",
      newVal!,
      "--secret",
      `${v.newValue instanceof SecretVal}`,
    ];
  }), { parseJson: false });

  console.log(chalk.bold`Variable groups updated successfully!`);
}