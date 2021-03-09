import { runAzCommand, runAzParallel } from "../utils/AzUtils";
import { promptToConfirm, startSpinner } from "../utils/MiscUtils";
import { getVarGroups } from "./get";
import chalk = require("chalk");
import { Argv } from "yargs";
import { VarGroupCollection } from "./VarGroupCollection";

export const command = "auth <prefix> <email>"
export const desc = "Grant a user access to a set of variable groups";
export const builder = (yargs: Argv) => yargs
  .positional("prefix", {
    describe: "Common prefix for a set of variable groups.",
    type: "string"
  })
  .positional("email", {
    describe: "Email address of user to be granted access.",
    type: "string"
  })
  .options({
    admin: {
      alias: "a",
      describe: "Also include \"Administer\" permissions.  By default, only \"View\" and \"Use\" permissions will be granted.",
      type: "boolean"
    }
  });
export function handler(argv: any) { addVarGroupPermissions(argv.prefix, argv.email, argv.admin); }

// These bits come from `az devops security permission namespace show --id b7e84409-6553-448a-bbb2-af228e07cbeb`
enum VarGroupAllowBits {
  View = 0x01,
  Administer = 0x02,
  Create = 0x04,
  ViewSecrets = 0x08,
  Use = 0x10,
  Owner = 0x20,
}

async function addVarGroupPermissions(prefix: string, email: string, admin: boolean) {
  let allowBits = VarGroupAllowBits.View | VarGroupAllowBits.Use;
  if (admin) 
    allowBits = allowBits | VarGroupAllowBits.Administer;

  const vg = await getVarGroups(prefix, undefined, true);

  const spinner = startSpinner(chalk`Running {bold az devops security permission list} ...`);
  const groupFilters = Object.values(vg.groups).map((g) => `contains(@.token, 'VariableGroup/${g.id}')`);
  const permissions = await runAzCommand([
    "devops",
    "security",
    "permission",
    "list",
    "--only-show-errors",
    "--id",
    "b7e84409-6553-448a-bbb2-af228e07cbeb",
    "--subject",
    email,
    "--query",
    `"[?(${groupFilters.join("||")})].{token:token,allow:acesDictionary.*.allow,effective:acesDictionary.*.*.effectiveAllow[]}"`,
  ]);
  spinner.stop();

  const updates: string[] = [];
  const azCommands: string[][] = [];
  for (const perm of permissions) {
    const current = perm.allow[0] ?? 0;
    const effective = perm.effective[0] ?? 0;
    const missingBits = allowBits & (allowBits ^ effective);
    if (missingBits > 0) {
      updates.push(chalk`    {blue ${perm.token.replace(/VariableGroup\/\d+/, chalk`{bold $&}`)}} aka {cyan.bold ${getVarGroupName(perm.token, vg)}}{gray : }{red ${current}} ${getBitsLabel(current)} ==> {green.bold ${allowBits}} ${getBitsLabel(allowBits)}\n`);
      azCommands.push([
        "devops",
        "security",
        "permission",
        "update",
        "--only-show-errors",
        "--allow-bit",
        String(allowBits),
        "--id",
        "b7e84409-6553-448a-bbb2-af228e07cbeb",
        "--subject",
        email,
        "--token",
        perm.token,
      ]);
    }
  }

  if (updates.length <= 0) {
    console.log(chalk.bold`Nothing to change - user ${email} already has access!`);
    return;
  }

  console.log(chalk`Going to {green.bold UPDATE} the following permission bits:`);
  console.log(updates.join(""));
  
  await promptToConfirm();

  await runAzParallel(azCommands);
  console.log(chalk.bold`Variable group permissions updated successfully!`);
}

function getBitsLabel(bits: number) {
  const names: string[] = [];
  for (const [key, val] of Object.entries(VarGroupAllowBits)) {
    if (typeof val !== "string" && bits === (bits | val))
      names.push(key);
  }
  return chalk.gray`(${(names.length === 0) ? "NONE" : names.join(",")})`;
}

function getVarGroupName(token: string, collection: VarGroupCollection) {
  const id = parseInt(token.replace(/.*VariableGroup\/(\d+)/, "$1"));
  for (const g of Object.values(collection.groups))
    if (g.id === id)
      return g.name;

  throw new Error("Unknown variable group!");
}