import { getAzConfig, runAzCommand, runAzParallel } from "../utils/AzUtils";
import { promptToConfirm, startSpinner } from "../utils/MiscUtils";
import chalk = require("chalk");
import { Argv } from "yargs";

export const command = "copy-checks <source> <partialTarget>"
export const desc = chalk`Copies all checks from the <source> service connection to all service connections whose names contain <partialTarget>
Note that {bold this will create duplicate checks} if they already exist in the target service connections!`;
export const builder = (yargs: Argv) =>
  yargs
    .positional("source", {
      describe: "Name of an existing service connection to copy checks from.",
      type: "string"
    })
    .positional("partialTarget", {
      describe: "Name substring to match for target service connections.",
      type: "string"
    })
    .options({
      clean: {
        alias: "c",
        describe: "Remove all checks on target service connections before copying to avoid any duplicates.",
        type: "boolean"
      }
    });
export function handler(argv: any) { copySvcConnChecks(argv.source, argv.partialTarget, argv.clean); }

async function copySvcConnChecks(source: string, partialTarget: string, clean: boolean) {
  const sourceSvcConns = await getSvcConns(`?name=='${source}'`);
  if (sourceSvcConns.length !== 1)
    throw new Error(`The service connection "${source}" not found.`);

  const targetSvcConns = await getSvcConns(`?contains(@.name, '${partialTarget}')`);
  if (targetSvcConns.length === 0) {
    console.log(chalk.bold`No service connections contained the substring "${partialTarget}"`);
    return;
  }

  // az is slow, so get both source and target checks in one request...
  const allChecks = await getChecks([...sourceSvcConns, ...targetSvcConns]);
  const targetChecks = allChecks.filter((c: any) => c?.resource?.id !== sourceSvcConns[0].id);
  const sourceChecks = allChecks.filter((c: any) => c?.resource?.id === sourceSvcConns[0].id);
  if (sourceChecks.length === 0) {
    console.log(chalk.bold`Nothing to copy - the service connection "${source}" does not have any approvals or checks.`);
    return;
  }

  const idsWithChecks = new Set(allChecks.map((c: any) => c?.resource?.id));
  idsWithChecks.delete(sourceSvcConns[0].id);

  if (clean && idsWithChecks.size > 0) {
    console.log(chalk`Going to {red.bold DELETE} the following approvals and checks on target service connections:`);
    console.log(targetChecks.map(t => getDisplayStringForCheck(t, formatSvcConnName(t.resource.name, partialTarget, true))).join("\n"));
    console.log();
  } 

  console.log(chalk`Going to {green.bold COPY} the following approvals and checks:`);
  console.log(sourceChecks.map(s => getDisplayStringForCheck(s)).join("\n"));
  console.log(chalk`to {italic each} of the following service connections:`);
  console.log(targetSvcConns.map((sc: any) => `    ${formatSvcConnName(sc.name, partialTarget, idsWithChecks.has(sc.id))}`).join("\n"));
  console.log();

  if (!clean && idsWithChecks.size > 0) {
    console.log(chalk.yellow`{bold WARNING:} There are {red.bold ${idsWithChecks.size}} target service connection(s) that already contain checks.`);
    console.log(chalk`{yellow Continuing anyway may result in }{red.bold DUPLICATE }{yellow checks being created!}`);
    console.log(chalk`{yellow.dim To avoid duplicates, you can use the {reset.green.bold --clean} option to delete these before copying. }`);
  }

  await promptToConfirm();

  if (clean)
    await runAzParallel(targetChecks.map((check: any) => getArgsForDeleteCheck(check)), {parseJson: false});
  
  const azCommands: string[][] = [];
  for (const target of targetSvcConns) {
    azCommands.push(...sourceChecks.map((check: any) => getArgsForCreateCheck(target, check)));
  }
  await runAzParallel(azCommands, { inFile: true });

  console.log(chalk.bold`Service connections updated successfully!`);
}


function getArgsForCreateCheck(target: any, check: any): string[] {
  const [_org, project] = getAzConfig();
  const {type, settings, timeout} = check;
  return [
    "devops",
    "invoke",
    "--route-parameters", `project=${project}`,
    "--area", "PipelinesChecks",
    "--resource", "configurations",
    "--http-method", "POST",
    "--api-version", "5.2-preview",
    "--only-show-errors",
    "--in-file",
    JSON.stringify({ type, settings, timeout, resource: target })
  ];
}

function getArgsForDeleteCheck(check: any): string[] {
  const [_org, project] = getAzConfig();
  return [
    "devops",
    "invoke",
    "--route-parameters", `project=${project}`, `id=${check.id}`,
    "--area", "PipelinesChecks",
    "--resource", "configurations",
    "--http-method", "DELETE",
    "--api-version", "5.2-preview",
    "--only-show-errors",
  ];
}


async function getSvcConns(queryFilter: string): Promise<any[]> {
  const spinner = startSpinner(chalk`Running {bold az devops service-endpoint list} ...`)  
  const svcConns = await runAzCommand([
    "devops",
    "service-endpoint",
    "list",
    "--query", `sort_by([${queryFilter}],&name)|[].{name: name, id: id, type: 'endpoint'}`,
    "--only-show-errors",
  ]);
  spinner.stop();
  return svcConns;
}

async function getChecks(svcConns: any[]): Promise<any[]> {
  const [_org, project] = getAzConfig();
  const spinner = startSpinner(chalk`Running {bold az devops invoke} ...`)
  const checks = await runAzCommand([
    "devops",
    "invoke",
    "--route-parameters", `project=${project}`,
    "--area", "PipelinesChecks",
    "--resource", "queryconfigurations",
    "--http-method", "POST",
    "--api-version", "5.2-preview",
    "--query-parameters", "$expand=1",
    "--only-show-errors",
    "--in-file",
    JSON.stringify(svcConns)
  ], { inFile: true });
  spinner.stop();
  return checks.value;
}

function formatUserName(name: string) {
  const parts = name.split("\\");
  if (parts.length === 2)
    return chalk`{gray ${parts[0]}\\}{bold ${parts[1]}}`;
  return chalk.bold(name);
}

function formatSvcConnName(name: string, prefix: string, warning: boolean) {
  const color = (warning) ? chalk.yellow.dim : chalk.cyan.dim;
  const brightColor = (warning) ? "reset.yellow" : "reset.cyan";

  const parts = name.split(prefix);
  if (parts.length > 1)
    return parts.map(p => chalk`{${brightColor} ${p}}`).join(color(prefix));
  if (parts.length === 1 && name.startsWith(prefix))
    return color`${prefix}{${brightColor} ${parts[0]}}`;
  if (parts.length === 1 && name.endsWith(prefix))
    return color`{${brightColor} ${parts[0]}}${prefix}`;
  return color(name);
}

function getDisplayStringForCheck(check: any, name?: string): string {
  const suffix = (name) ? chalk.dim` (for ${name})` : "";
  if (check.type?.name === "Approval") {
    const displayName = chalk`{blue.bold [Approvals]} {cyan.bold All approvers must approve ${(check.settings?.executionOrder === "inSequence") ? "in sequence" : ""}}`;
    const names = check.settings.approvers.map((a: any) => `        ${formatUserName(a.displayName)}`).join("\n");
    if (name)
      return chalk`    ${displayName}{gray ...} ${suffix}`;

    return chalk`    ${displayName }${suffix}{gray :} \n${names}`;
  }

  const type = (check.type?.name === "Task Check" && check.settings?.definitionRef?.name === "InvokeRESTAPI") ? "Invoke REST API" : check.type?.name;
  return chalk`    {blue.bold [${type}]} {cyan.bold ${check.settings.displayName}} ${suffix}`;
}
