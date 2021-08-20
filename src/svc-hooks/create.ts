/* eslint-disable no-case-declarations */
/* eslint-disable @typescript-eslint/no-unused-vars */
// https://docs.microsoft.com/en-us/azure/devops/service-hooks/create-subscription?view=azure-devops#create-a-subscription-for-a-org

import * as fs from "fs";
import { runAzCommand } from "../utils/AzUtils";
import { startSpinner } from "../utils/MiscUtils";
const prompts = require("prompts");

import chalk = require("chalk");

export const command =
  "create <org> <project> <event> <url> [user.name user.password] [headers] [level]";
export const desc = "Create a service hook for a proj";
export const builder = (yargs: import("yargs").Argv) =>
  yargs
    // org, project, event, POST URL, user (optional), HTTP headers (optional), resource details to send {All | Minimal | None}.
    .positional("org", {
      describe: "Org to add webhook on",
      type: "string",
    })
    .positional("project", {
      describe: "Project to add webhook on",
      type: "string",
    })
    .positional("event", {
      describe:
        "Event trigger. See here for eventTypes: https://docs.microsoft.com/en-us/azure/devops/service-hooks/events?view=azure-devops",
      type: "string",
    })
    .positional("url", {
      describe: "URL for webhook to POST to",
      type: "string",
    })
    .coerce("url", (url: string) => {
      // Check if valid URL.
      const regexp =
        /(http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-/]))?/;
      if (!regexp.test(url)) {
        throw new Error("Invalid URL. URL must start with http.");
      } else {
        return url;
      }
    })
    .option("user", {
      alias: "u",
      describe: "Basic auth for webhook. Use --user.name and --user.password",
    })
    // .coerce("user", (user: string[]) => {
    //   // Check if name and password are provided.
    //   if (user !== undefined) {
    //     if (user !== undefined && "name" in user && "password" in user) {
    //       return user;
    //     } else {
    //       throw new Error(
    //         "Could not read user. Example: --user.name=Batman --user.password=WhereIsShe?"
    //       );
    //     }
    //   } else {
    //     return;
    //   }
    // })
    .option("headers", {
      alias: "H",
      describe:
        "HTTP headers to send with the webhook's POST request. Use --headers.<header>",
      type: "string",
    })
    .option("file", {
      alias: "F",
      describe:
        "File path containing HTTP headers to send with the webhook's POST request",
      type: "string",
    })
    .normalize("file")
    .coerce("file", (fp: string) => {
      if (fp !== undefined) {
        if (fs.existsSync(fp)) {
          try {
            fs.readFileSync(fp, "utf8");
            return fp;
          } catch (err) {
            throw new Error(`Could not read file" ${fp}`);
          }
        } else {
          throw new Error(`File ${fp} does not exist.`);
        }
      } else {
        return fp;
      }
    })
    .option("level", {
      alias: "l",
      describe: "Resource details to send",
      default: "all",
      choices: ["all", "minimal", "none"],
      type: "string",
    })
    .check((argv: any) => {
      const validEventTypes = [
        "build.complete",
        "ms.vss-release.release-abandoned-event",
        "ms.vss-release.release-created-event",
        "ms.vss-release.deployment-approval-completed-event",
        "ms.vss-release.deployment-approval-pending-event",
        "ms.vss-release.deployment-completed-event",
        "ms.vss-release.deployment-started-event",
        "ms.vss-pipelines.run-state-changed-event",
        "ms.vss-pipelines.stage-state-changed-event",
        "ms.vss-pipelinechecks-events.approval-pending",
        "ms.vss-pipelinechecks-events.approval-completed",
        "tfvc.checkin",
        "git.push",
        "git.pullrequest.created",
        "git.pullrequest.merged",
        "git.pullrequest.updated",
        "workitem.created",
        "workitem.deleted",
        "workitem.restored",
        "workitem.updated",
        "workitem.commented",
        "message.posted",
      ];
      return validEventTypes.includes(argv.event);
    })
    .conflicts("headers", "file"); // Headers and file are mutually exclusive.

export async function handler(argv: any) {
  // Search the orgId of the org we'd like to create a hook for.
  // az devops invoke --area core --resource projects --organization https://dev.azure.com/bentleycs --api-version=6.1-preview
  const spinner = startSpinner(
    chalk`Finding your project via {bold az devops invoke} ...`
  );
  const projects = await runAzCommand([
    "devops",
    "invoke",
    "--area",
    "core",
    "--resource",
    "projects",
    "--organization",
    `https://dev.azure.com/${argv.org}`,
    "--api-version",
    "6.1-preview",
  ]);
  spinner.stop();


  // Get projectId of desired project
  const desiredProject = projects.value.find(
    (e: any) => e.name.toLowerCase() === argv.project.toLowerCase()
  );
  if (desiredProject === undefined) {
    throw new Error("Could not find project");
  }
  const projectId = desiredProject.id;

  // ALREADY DONE: Determine the event ID and settings

  // Determine consumer and action IDs and settings

  // Create the webhook
  // Prepare contents of the request.

  // Fill in required fields depending on our event type.
  // https://docs.microsoft.com/en-us/azure/devops/service-hooks/events?view=azure-devops#build.complete
  const publisherInputs: any = {};
  const body = {
    publisherId: "",
    eventType: argv.event,
    resourceVersion: "1.0",
    consumerId: "webHooks",
    consumerActionId: "httpRequest",
    publisherInputs: {},
    consumerInputs: {
      url: argv.url,
    },
  };
  // TODO: Add more cases for the other event types.
  // Get required inputs for desired event type.
  let responses: any = {};
  let questions: any;
  switch (argv.event) {
    case "build.complete":
      body.publisherId = "tfs";
      // Get definitionName, buildStatus
      questions = [
        { type: "text", name: "definitionName", message: "Definition name: " },
        { type: "text", name: "buildStatus", message: "Build status: " },
      ];
      await (async () => {
        responses = await prompts(questions);
      })();
      publisherInputs.definitionName = responses.definitionName;
      publisherInputs.buildStatus = responses.buildStatus;
      break;
    case "ms.vss-pipelines.stage-state-changed-event":
      body.publisherId = "pipelines";
      // Get pipelineId, stageNameId, stageStateId
      questions = [
        { type: "text", name: "pipelineId", message: "Pipeline ID: " },
        { type: "text", name: "stageNameId", message: "Stage name ID: " },
        { type: "text", name: "stageStateId", message: "Stage state ID: " }
      ];
      await (async () => {
        responses = await prompts(questions);
      })();
      publisherInputs.pipelineId = responses.pipelineId;
      publisherInputs.stageNameId = responses.stageNameId;
      publisherInputs.stageStateId = responses.stageStateId;
      break;
    case "git.push":
      body.publisherId = "tfs";
      // Get branch, pushedBy, and responsitory
      questions = [
        { type: "text", name: "repository", message: "Repository: " },
        { type: "text", name: "branch", message: "Branch: " },
      ];
      await (async () => {
        responses = await prompts(questions);
      })();
      publisherInputs.repository = responses.repository;
      publisherInputs.branch = responses.branch;
      break;
  }
  body.publisherInputs = publisherInputs;

  // Save request body JSON to file, then pass file path to az devops invoke
  fs.writeFile("tmp.json", JSON.stringify(body), (err) => {
    if (err) {
      throw err;
    }
  });

  const spinner2 = startSpinner(
    chalk`Requesting all service hooks via {bold az devops invoke} ...`
  );
  // const response = await runAzCommand(
  //   [
  //     "devops",
  //     "invoke",
  //     "--route-parameters",
  //     "hubName=../../hooks/subscriptions",
  //     "--area",
  //     "distributedtask",
  //     "--resource",
  //     "hublicense",
  //     "--api-version",
  //     "6.1-preview",
  //     "--http-method",
  //     "POST",
  //     "--only-show-errors",
  //     "--in-file",
  //     "tmp.json",
  //     JSON.stringify({
  //       contributionIds: ["ms.vss-build-web.run-attempts-data-provider"],
  //     }),
  //   ],
  //   { inFile: true }
  // );
  spinner2.stop();

}

export async function createServiceHook() {
  console.log("TO BE IMPLEMENTED");
}
