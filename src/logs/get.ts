import { getAzConfig, runAzCommand, runAzParallel } from "../utils/AzUtils";
import { promptToConfirm, startSpinner } from "../utils/MiscUtils";
import util = require("util");
import chalk = require("chalk");
import path = require("path");
import fs = require("fs");
import { Argv } from "yargs";

export const command = "get <url>";
export const desc = "Finds and summarizes all failures in a given pipeline run";
export const builder = (yargs: import("yargs").Argv) =>
  yargs
    .positional("url", {
      describe: "URL of an Azure DevOps pipeline run.",
      type: "string"
    });
export function handler(argv: any) { getFailures(argv.url); }

async function getFailures(url: string) {
  const [org, project] = getAzConfig();
  const parsed = new URL(url);
  const runId = parsed.searchParams.get("buildId") as string;

  const rootTimeline: any[] = await getTimeline(runId);
  const past = await getAllPastAttempts(project, runId, rootTimeline.filter(t => t.type === "Stage").map((stage: any) => stage.identifier));

  const stages = createIndex(past, "stages");
  const jobs = createIndex(past, "jobs");
  const phases = createIndex(past, "phases");
  const tasks = createIndex(past, "tasks");
  const failed: any[] = Object.values(tasks).filter((t:any) => t.result === 2).sort((a: any, b: any) => Date.parse(a.startTime) - Date.parse(b.startTime));

  console.log(chalk.bold`Found ${failed.length} {red FAILED} task logs:`);
  for (const task of failed) {
    const job = jobs[task.parentId];
    const phase = phases[job.parentId];
    const stage = stages[phase.parentId];

    const startTime = new Date(Date.parse(task.startTime)).toUTCString();
    const logUrl = `${org}/${project}/_apis/build/builds/${runId}/logs/${task.logId}`;

    console.log(chalk`  {gray ${startTime}}  {blue ${stage.name}}{gray /}{blue ${job.name} {dim (Attempt ${job.attempt})}}{gray /}{cyan.bold ${task.name}}{gray :} {underline ${logUrl}}`);
  }
}

async function getTimeline(runId: string): Promise<any[]> {
  const [_org, project] = getAzConfig();
  const spinner = startSpinner(chalk`Running {bold az devops invoke} ...`);
  const res = await runAzCommand([
    "devops",
    "invoke",
    "--route-parameters",
    `project=${project}`,
    `buildId=${runId}`,
    "--area", "build",
    "--resource", "timeline",
    "--api-version", "6.1-preview",
    "--only-show-errors",
  ]);
  spinner.stop();
  return res.records;
}

async function getAllPastAttempts(project: string, runId: string, stageIds: string[]): Promise<any[]> {
  // FIXME: This is a truly **evil** hack.  We really need to use the (private) Contribution/HierarchyQuery Azure DevOps REST endpoint (otherwise this 
  // would take 1000s of requests), but for some reason az devops invoke won't let you call "Contribution" APIs, so I have to trick it by using some
  // other random API call with a relative path in the route...
  return runAzParallel(stageIds.map(id => [
    "devops",
    "invoke",
    "--route-parameters",
    `hubName=../../Contribution/HierarchyQuery/project/${project}`,
    "--area", "distributedtask",
    "--resource", "hublicense",
    "--api-version", "6.1-preview",
    "--http-method", "POST",
    "--only-show-errors",
    "--in-file", JSON.stringify({
      "contributionIds": [
        "ms.vss-build-web.run-attempts-data-provider"
      ],
      "dataProviderContext": {
        "properties": {
          "buildId": runId,
          "stageName": id,
          "sourcePage": {
            "routeId": "ms.vss-build-web.ci-results-hub-route",
            "routeValues": {
              "project": project,
            }
          }
        }
      }
    })
  ]), {inFile: true});
}

function createIndex(data: any[], type: string) {
  return Object.fromEntries(data.flatMap((x:any) =>x.dataProviders["ms.vss-build-web.run-attempts-data-provider"].flatMap((x:any) => x[type])).map((x: any) => [x.id, x]));
}