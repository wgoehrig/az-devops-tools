import chalk from "chalk";
import * as fs from "fs";
import YAML from "yaml";
import { runAzCommand, runAzParallel } from "../utils/AzUtils.js";
import { startSpinner } from "../utils/MiscUtils.js";
import { HookInput, ProjectData, RepoData } from "./Types.js";


export const command = "create <file>";
export const desc = "Create service hook(s) from a supplied YAML file";
export const builder = (yargs: import("yargs").Argv) =>
  yargs.positional("file", {
    alias: "F",
    describe: "File path containing new service hooks to be created",
    type: "string",
    normalize: true,
  });

export async function handler(argv: any) {
  // Open and read service hook from file
  const file = argv.file;
  const fileContents = fs.readFileSync(file, "utf8");

  // Parse service hook file contents
  const hookData: [] = YAML.parse(fileContents);

  const azCommands: string[][] = [];

  const spinner = startSpinner("Preparing service hooks and looking up any missing required data...");
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
          acceptUntrustedCerts: hook.eventSpecificArgs.acceptUntrustedCerts,
        },
        eventType: hook.eventType,
        publisherId: hook.eventSpecificArgs.publisherId,
        publisherInputs: {},
        "resourceVersion": "5.1-preview.1",
        scope: 1,
      };

      // Check if eventType is valid, populated publisherInputs
      switch (hook.eventType) {
        case "build.complete":
          hookDataFormatted.consumerInputs.acceptUntrustedCerts = hook.eventSpecificArgs.acceptUntrustedCerts;
          hookDataFormatted.publisherInputs = {
            buildStatus: hook.eventSpecificArgs.buildStatus,
            definitionName: hook.eventSpecificArgs.pipelineName,
            projectId: await searchProjId(hook.org, hook.project),
          };
          break;
        case "ms.vss-pipelines.stage-state-changed-event":
          hookDataFormatted.publisherInputs = {
            pipelineId: hook.eventSpecificArgs.buildDefinitionId,
            stageNameId: hook.eventSpecificArgs.stageNameId,
            stageStateId: hook.eventSpecificArgs.stageStateId,
            stageResultId: hook.eventSpecificArgs.stageResultId,
            projectId: await searchProjId(hook.org, hook.project),
          };
          break;
        case "git.push":
          hookDataFormatted.publisherInputs = {
            branch: hook.eventSpecificArgs.branch,
            projectId: await searchProjId(hook.org, hook.project),
            pushedBy: hook.eventSpecificArgs.pushedBy,
            repository: await searchRepoId(hook.eventSpecificArgs.repoName),
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
  spinner.stop();

  // Start creating webhooks
  spinner.text = chalk`Creating ${azCommands.length} service hooks...via {bold az devops invoke}`;
  await runAzParallel(azCommands, { inFile: true });
  spinner.stop();
  console.log(chalk.green`Successfully created some service hooks`);
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
