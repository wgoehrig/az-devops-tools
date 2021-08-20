// https://docs.microsoft.com/en-us/azure/devops/service-hooks/create-subscription?view=azure-devops#create-a-subscription-for-a-org

import * as fs from "fs";
import { runAzCommand } from "../utils/AzUtils";
import { startSpinner } from "../utils/MiscUtils";
import * as readline from "readline";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

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

  console.log(projects);

  // Get projectId of desired project
  const desiredProject = projects.value.find(
    (e: any) => e.name.toLowerCase() === argv.project.toLowerCase()
  );
  if (desiredProject === undefined) {
    throw new Error("Could not find project");
  }
  const projectId = desiredProject.id;
  console.log(argv.project.toLowerCase(), projectId);

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
  switch (argv.event) {
    case "build.complete":
      publisherInputs.buildStatus =  1;
      publisherInputs.definitionName =  1;
      body.publisherId = "tfs";
      // resource name??
      break;
    case "ms.vss-pipelines.stage-state-changed-event":
      publisherInputs.PipelineId = 1;
      publisherInputs.runStateId = 1;
      body.publisherId = "pipelines";
      break;
    case "git.push":
      publisherInputs.branch =  rl.question("Branch: ", (a) => {rl.close(); return a;});
      publisherInputs.pushedBy =  1;
      publisherInputs.repository =  1;
      body.publisherId = "tfs";
      break;
  }
  body.publisherInputs = publisherInputs;

  console.log(argv);
  console.log(body);
}

export async function createServiceHook() {
  console.log("TO BE IMPLEMENTED");
}
