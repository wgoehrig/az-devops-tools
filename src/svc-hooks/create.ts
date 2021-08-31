import * as fs from "fs";
import { runAzCommand, runAzParallel } from "../utils/AzUtils";
import { startSpinner } from "../utils/MiscUtils";
import { validEventTypes } from "./EventTypes";
import { HookInput, RepoData, ProjectData } from "./Types";
import { Argv } from "yargs";

const JS = require("js-yaml");

import chalk from "chalk";

export const command = "create <file>";
export const desc = "Create a service hook for a proj";
export const builder = (yargs: Argv) =>
  yargs.positional("file", {
    alias: "F",
    describe: "File path containing new service hooks to be created",
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
    throw new Error("Invalid file type");
  }

  const azCommands: string[][] = [];

  const spinner2 = startSpinner("Preparing service hooks and looking up any missing required data...");
  // Prepare our az commands.
  await Promise.all(
    hookData.map(async (hook: HookInput) => {
      // Check if hook data is missing any data
      if (!hook.org || !hook.project || !hook.eventType || !hook.url) {
        throw new Error("Missing data in file");
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
            projectId: await searchProjId(hook.org, hook.project),
            repository: await searchRepoId(hook.eventSpecificArgs.repoName),
            branch: hook.eventSpecificArgs.branch,
            pushedBy: hook.eventSpecificArgs.pushedBy,
          };
          break;
        default:
          throw new Error("Invalid event type");
      }

      // Add command to azCommands, so we can run it in parallel later
      // POST request to https://dev.azure.com/<org>/_apis/hooks/subscriptions
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
    })
  );
  spinner2.stop();

  // Start creating webhooks
  const spinner = startSpinner(
    chalk`Creating ${azCommands.length} service hooks...via {bold az devops invoke}`
  );
  await runAzParallel(azCommands, { inFile: true });
  spinner.stop();
}

async function searchRepoId(name: string) {
  // Find the repo's id.
  const repos = await runAzCommand(["repos", "list"]);
  const desiredRepo = repos.find(
    (repo: RepoData) => repo.name.toLowerCase() === name.toLowerCase()
  );
  if (desiredRepo === undefined) {
    throw new Error("Could not resolve repo id");
  }
  const repoId = desiredRepo.id;
  return repoId;
}

async function searchProjId(org: string, project: string) {
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
    (proj: ProjectData) => proj.name.toLowerCase() === project.toLowerCase()
  );
  if (desiredProject === undefined) {
    throw new Error("Could not resolve project id");
  }
  const projectId = desiredProject.id;
  return projectId;
}
