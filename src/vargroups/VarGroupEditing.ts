import chalk = require("chalk");
import util = require("util");
import { AzVarGroupJson, displayValue, isDeleted, rawValue, ValueType, VarGroupCollection } from "./VarGroupCollection";

export function findChanges(oldVars: VarGroupCollection, newVars: VarGroupCollection): VarGroupCollectionChanges {
  const groupAliases = new Set(newVars.aliases);

  const changes: VarGroupCollectionChanges = {
    newGroups: [],
    changedVars: [],
  };

  for (const alias of groupAliases) {
    const newGroup = newVars.groups[alias];
    const oldGroup = oldVars.groups[alias];

    if (oldGroup === undefined) {
      const variables = newVars.varNames
        .map((n): [string, ValueType] => [n, newVars.getValue(alias, n)])
        .filter(([_n, val]) => {
          const raw = rawValue(val);
          return !(undefined === raw || "" === raw || null === raw || isDeleted(raw));
        });

      changes.newGroups.push({
        alias,
        name: newGroup.name,
        description: newGroup.description,
        variables,
      });
      groupAliases.delete(alias);
      continue;
    }

    if (newGroup.name !== oldGroup.name || newGroup.id !== oldGroup.id) {
      console.error("ERROR: group defined in YAML does not match group in Azure DevOps");
      console.error(`Expected: \n${util.inspect(oldGroup, false, 3, true)}\n\nBut got: ${util.inspect(newGroup, false, 3, true)}`);
      process.exit(1);
    }
  }

  for (const varName of newVars.varNames) {
    for (const groupAlias of groupAliases) {
      const groupId = newVars.groups[groupAlias].id;
      const groupName = newVars.groups[groupAlias].name;
      const oldValue = oldVars.getValue(groupAlias, varName);
      const newValue = newVars.getValue(groupAlias, varName);

      let newRaw = rawValue(newValue);
      if (typeof newRaw === "number") // it's easy to accidentally set a number instead of string in YAML - we can just convert those...
        newRaw = String(newRaw);
      
      // Skip anything missing, null, or ""
      if (undefined === newRaw || "" === newRaw || null === newRaw)
        continue;

      if (isDeleted(newRaw) && undefined === oldValue)
        continue;

      if (newRaw === rawValue(oldValue))
        continue;

      changes.changedVars.push({
        groupId,
        groupAlias,
        groupName,
        varName,
        newValue,
        oldValue,
      });
    }
  }

  return changes;
}

function formatGroupName(name: string, alias: string) {
  if (name.endsWith(alias))
    return chalk.blue(name.substring(0, name.length - alias.length) + chalk.bold(alias));
  return chalk.blue(name);
}

export function printChangeSummary(changes: VarGroupCollectionChanges) {
  if (changes.newGroups.length > 0) {
    console.log(chalk`Going to {bold.cyan CREATE} the following variable groups:`);
    for (const g of changes.newGroups) {
      console.log(chalk`    ${formatGroupName(g.name, g.alias)}{gray : }{gray.italic ${g.description || ""}}`);
      for (const [varName, value] of g.variables)
        console.log(chalk`      {cyan.bold ${varName}}{gray : }{green.bold ${displayValue(value)}}`);
    }
    console.log();
  }

  if (changes.changedVars.length > 0) {
    const addedVars: string[] = [];
    const updatedVars: string[] = [];
    const deletedVars: string[] = [];
    for (const v of changes.changedVars) {
      if (v.oldValue === undefined)
        addedVars.push(chalk`    ${formatGroupName(v.groupName, v.groupAlias)}{gray /}{cyan.bold ${v.varName}}{gray : }{green.bold ${displayValue(v.newValue)}}\n`);
      else if (!isDeleted(v.newValue))
        updatedVars.push(chalk`    ${formatGroupName(v.groupName, v.groupAlias)}{gray /}{cyan.bold ${v.varName}}{gray : }{red ${displayValue(v.oldValue)}} {gray ==> } {green.bold ${displayValue(v.newValue)}}\n`);
      else
        deletedVars.push(chalk`    ${formatGroupName(v.groupName, v.groupAlias)}{gray /}{cyan.bold ${v.varName}}{gray : }{red.strikethrough ${displayValue(v.oldValue)}}\n`);
    }

    if (addedVars.length > 0) {
      console.log(chalk`Going to {green.bold ADD} the following variables:`);
      console.log(addedVars.join(""));
    }

    if (updatedVars.length > 0) {
      console.log(chalk`Going to {green.bold UPDATE} the following variables:`);
      console.log(updatedVars.join(""));
    }

    if (deletedVars.length > 0) {
      console.log(chalk`Going to {red.bold DELETE} the following variables:`);
      console.log(deletedVars.join(""));
    }
  }
}

interface VarGroupCollectionChanges {
  newGroups: NewVarGroup[];
  changedVars: ChangedVariable[];
}

interface ChangedVariable {
  groupId: number;
  groupAlias: string;
  groupName: string;
  varName: string;
  oldValue?: ValueType;
  newValue: ValueType;
}

interface NewVarGroup {
  alias: string;
  name: string;
  description?: string | null;
  variables: Array<[string, ValueType]>;
}
