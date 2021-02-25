
import chalk = require("chalk");
import * as YAML from "yaml";

export const deleted = Symbol();
export function isDeleted(v: ValueType): v is typeof deleted {
  return (v === deleted);
}

export type ValueType = string | null | SecretVal | typeof deleted;
interface ExpandedVar {
  [alias: string]: ValueType;
}
function isExpandedVar(v: ValueType | ExpandedVar): v is ExpandedVar {
  return (typeof v === "object" && v !== null && !(v instanceof SecretVal));
}

export class SecretVal {
  constructor(public value: string | null) { }
  public toString() { return this.value; }
}

export function rawValue(v: ValueType): string | null | typeof deleted {
  return (v instanceof SecretVal) ? v.value : v;
}

export function displayValue(v: ValueType): string {
  if (v instanceof SecretVal)
    return chalk.yellow("*****");
  if (v === undefined || isDeleted(v))
    return chalk.bgRed("     ");
  if (v === "")
    return chalk.bgRedBright.black(` "" `);
  if (v === null)
    return chalk.bgRedBright.black(`null`);

  return v;
}

const secretYamlTag = {
  identify: (value: any) => value instanceof SecretVal,
  tag: "!secret",
  resolve(_doc: any, cst: any) {
    return new SecretVal(cst.strValue === "null" ? null : cst.strValue);
  },
};

const deleteYamlTag = {
  identify: (value: any) => value === deleted,
  tag: "!delete",
  resolve(_doc: any, _cst: any) { return deleted },
};

export interface VarGroupYaml {
  groups: {
    [alias: string]: {
      name: string;
      description: string;
      id: number;
      url: string;
    };
  };
  variables: {
    [name: string]: ValueType | ExpandedVar;
  };
}

export interface AzVarGroupJson {
  id: number;
  name: string;
  description: string;
  variables: {
    [name: string]: {
      isSecret: true | null;
      value: string | null;
    };
  };
}

export class VarGroupCollection {
  private _yaml: VarGroupYaml;
  public get aliases(): string[] { return Object.keys(this._yaml.groups); }
  public get varNames(): string[] { return Object.keys(this._yaml.variables); }
  public get groups() { return this._yaml.groups; }
  public get variables() { return this._yaml.variables; }

  constructor() {
    this._yaml = {
      groups: {},
      variables: {},
    };
  }

  public addGroups(prefix: string, groups: AzVarGroupJson[]) {
    for (const g of groups) {
      const alias = g.name.replace(prefix, "").replace(/^[^\da-z]*/i, "");
      if (alias in this.groups)
        throw new Error(`Variable Group with alias "${alias}" already exists!`);

      this.groups[alias] = {
        id: g.id,
        name: g.name,
        description: g.description,
        url: encodeURI(`https://dev.azure.com/bentleycs/iModelTechnologies/_library?itemType=VariableGroups&view=VariableGroupView&variableGroupId=${g.id}&path=${g.name}`),
      };

      const missingVars = new Set(this.varNames);
      for (const p of Object.keys(g.variables)) {
        missingVars.delete(p);
        const { isSecret, value } = g.variables[p];
        this.appendValue(alias, p, (isSecret) ? new SecretVal(value) : value);
      }

      for (const p of missingVars) {
        const expanded = this.expandVar(p);
        delete expanded[alias];
        this.variables[p] = expanded;
      }
    }
  }

  private appendValue(groupAlias: string, varName: string, value: ValueType) {
    if (!(varName in this.variables)) {
      this._yaml.variables[varName] = (this.aliases.length > 1) ? { [groupAlias]: value } : value;
      return;
    }

    const variable = this.variables[varName];
    if (isExpandedVar(variable)) {
      variable[groupAlias] = value;
      return;
    }

    if (rawValue(value) === rawValue(variable))
      return;

    const expanded = this.expandVar(varName);
    expanded[groupAlias] = value;
    this._yaml.variables[varName] = expanded;
  }

  private expandVar(varName: string): ExpandedVar {
    const variable = this.variables[varName];
    if (isExpandedVar(variable))
      return variable;

    const expanded: ExpandedVar = {};
    for (const a of this.aliases)
      expanded[a] = variable;

    return expanded;
  }

  public getValue(groupAlias: string, varName: string): ValueType {
    const variable = this.variables[varName];
    if (!isExpandedVar(variable))
      return variable;

    return variable[groupAlias];
  }

  public getDisplayValue(groupAlias: string, varName: string): string {
    return displayValue(this.getValue(groupAlias, varName));
  }

  public toString() {
    let formattedStr = YAML.stringify({ groups: this.groups }, { customTags: [secretYamlTag] });
    formattedStr += "\n# Variables values are defined in below.  If a property is common to **all** groups, a single string value may be used.  Otherwise, a value should be provided for each group defined above.";
    formattedStr += "\n# Also, note that any \"\", null, or missing values will **not** be updated/deleted.  To clear a property value, you can use the web UI.  Secret begin with the !secret tag.\n";
    formattedStr += YAML.stringify({ variables: this.variables }, { customTags: [secretYamlTag] });

    return formattedStr;
  }

  public static fromYaml(str: string) {
    const collection = new VarGroupCollection();
    collection._yaml = YAML.parse(str, { customTags: [secretYamlTag, deleteYamlTag] });
    return collection;
  }
}