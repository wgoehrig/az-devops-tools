/* eslint-disable no-case-declarations */
/* eslint-disable @typescript-eslint/no-unused-vars */
// https://docs.microsoft.com/en-us/azure/devops/service-hooks/create-subscription?view=azure-devops#create-a-subscription-for-a-org

import * as fs from "fs";
import { runAzCommand, runAzParallel } from "../utils/AzUtils";
import { startSpinner } from "../utils/MiscUtils";
import { validEventTypes } from "./eventTypes";

const JS = require("js-yaml");

import chalk = require("chalk");

interface Hook {
  org: string;
  project: string;
  eventType: string;
  url: string;
  eventSpecificArgs: any;
}

export const command = "create <file>";
export const desc = "Create a service hook for a proj";
export const builder = (yargs: import("yargs").Argv) =>
  yargs.positional("file", {
    alias: "F",
    describe:
      "File path containing HTTP headers to send with the webhook's POST request",
    type: "string",
    normalize: true,
  });

export async function handler(argv: any) {
  // Open and read service hook from file
  const file = argv.file;
  const fileType = argv.file.split(".").pop().toLowerCase();
  const fileContents = fs.readFileSync(file, "utf8");

  // Parse service hook file contents
  let hookData: [];
  if (fileType === "json") {
    hookData = JSON.parse(fileContents);
  } else if (fileType === "yml") {
    hookData = JS.load(fileContents);
  } else {
    console.error(chalk.red("Invalid file type"));
    throw new Error(chalk.red("Invalid file type"));
  }

  const azCommands: string[][] = [];

  // Check if hook data is missing any data
  // hookData.map(async (hook: Hook) => {
  for (let i = 0; i < hookData.length; i++) {
    const hook: Hook = hookData[i];
    // Check if any keys are undefined | null
    if (!hook.org || !hook.project || !hook.eventType || !hook.url) {
      throw new Error(chalk.red("Missing data in file"));
    }

    // Read necessary args from hookData
    const hookDataFormatted = {
      consumerActionId: "httpRequest",
      consumerId: "webHooks",
      consumerInputs: {
        url: hook.url,
      },
      eventType: hook.eventType,
      publisherId: hook.eventSpecificArgs.publisherId,
      publisherInputs: {},
      resourceVersion: "1.0",
      scope: 1,
    };

    // Check if eventType is valid, populated publisherInputs
    switch (hook.eventType) {
      case "build.complete":
        hookDataFormatted.publisherInputs = {
          definitionName: hook.eventSpecificArgs.definitionName,
          buildStatus: hook.eventSpecificArgs.buildStatus,
        };
        break;
      case "ms.vss-pipelines.stage-state-changed-event":
        hookDataFormatted.publisherInputs = {
          pipelineId: hook.eventSpecificArgs.pipelineId,
          stageNameId: hook.eventSpecificArgs.stageNameId,
          stageStateId: hook.eventSpecificArgs.stageStateId,
        };
        break;
      case "git.push":
        hookDataFormatted.publisherInputs = {
          projectId: await searchProjId(hook.org, hook.project), // FIXME: WHY ARENT YOU AWAITING
          repository: await searchRepoId(hook.eventSpecificArgs.repoName),
          branch: hook.eventSpecificArgs.branch,
          pushedBy: hook.eventSpecificArgs.pushedBy,
        };
        break;
      default:
        throw new Error(chalk.red("Invalid event type"));
    }

    azCommands.push([
      "devops",
      "invoke",
      "--route-parameters",
      "hubName=../../hooks/subscriptions",
      "--area",
      "distributedtask",
      "--resource",
      "hublicense",
      "--api-version",
      "6.1-preview",
      "--http-method",
      "POST",
      "--only-show-errors",
      "--in-file",
      JSON.stringify(hookDataFormatted),
    ]);
    console.log("hookDataFormatted", hookDataFormatted);
  }

  // Start creating webhooks
  const spinner = startSpinner(
    chalk`Creating ${azCommands.length} service hooks...via {bold az devops invoke}`
  );
  await runAzParallel(azCommands, { inFile: true });
  spinner.stop();
  console.log("azCommands", azCommands);
}

async function searchRepoId(name: string) {
  interface Repo {
    defaultBranch: string;
    id: string;
    isDisabled: boolean;
    isFork: boolean;
    name: string;
    parentRepository: string | null | undefined;
    project: any;
    remoteUrl: string;
    size: number;
    sshUrl: string;
    url: string;
    validRemoteUrls: string | string[] | undefined | null;
    webUrl: string;
  }

  // Find the repo's id.
  const repos = await runAzCommand(["repos", "list"]);
  const desiredRepo = repos.find(
    (repo: Repo) => repo.name.toLowerCase() === name.toLowerCase()
  );
  if (desiredRepo === undefined) {
    throw new Error("Could not resolve repo id");
  }
  const repoId = desiredRepo.id;
  return repoId;
}

async function searchProjId(org: string, project: string) {
  interface Project {
    id: string;
    lastUpdateTime: string;
    name: string;
    revision: number;
    state: string;
    url: string;
    visibility: string;
  }

  const projects = await runAzCommand([
    "devops",
    "invoke",
    "--area",
    "core",
    "--resource",
    "projects",
    "--organization",
    `https://dev.azure.com/${org}`,
    "--api-version",
    "6.1-preview",
  ]);

  // Get projectId of desired project
  const desiredProject = projects.value.find(
    (proj: Project) => proj.name.toLowerCase() === project.toLowerCase()
  );
  if (desiredProject === undefined) {
    throw new Error("Could not resolve project id");
  }
  const projectId = desiredProject.id;
  return projectId;
}
