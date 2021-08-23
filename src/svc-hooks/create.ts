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
    throw new Error("Could not resolve project id");
  }
  const projectId = desiredProject.id;

  // Determine the event ID and settings
  // Determine consumer and action IDs and settings
  //        Prepare contents of the request.
  //        Fill in required fields depending on our event type.
  // https://docs.microsoft.com/en-us/azure/devops/service-hooks/events?view=azure-devops#build.complete
  const publisherInputs: any = {projectId: projectId};
  const body = {
    consumerActionId: "httpRequest",
    consumerId: "webHooks",
    consumerInputs: {
      url: argv.url,
    },
    eventType: argv.event,
    publisherId: "",
    publisherInputs: {},
    resourceVersion: "1.0",
    scope: 1,
  };
  // TODO: Add more cases for the other event types.
  // Get required inputs for desired event type.
  let responses: any = {};
  let questions: any;
  switch (argv.event) {
    // On build complete: get definitionName, buildStatus
    case "build.complete":
      body.publisherId = "tfs";
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
    // On Pipeline state changed: get pipelineId, stageNameId, stageStateId
    case "ms.vss-pipelines.stage-state-changed-event":
      body.publisherId = "pipelines";
      questions = [
        { type: "text", name: "pipelineId", message: "Pipeline ID: " },
        { type: "text", name: "stageNameId", message: "Stage name ID: " },
        { type: "text", name: "stageStateId", message: "Stage state ID: " },
      ];
      await (async () => {
        responses = await prompts(questions);
      })();
      publisherInputs.pipelineId = responses.pipelineId;
      publisherInputs.stageNameId = responses.stageNameId;
      publisherInputs.stageStateId = responses.stageStateId;
      break;
    // On git push: get branch, pushedBy, and responsitory
    case "git.push":
      body.publisherId = "tfs";
      questions = [
        { type: "text", name: "repository", message: "Repository: " },
        { type: "text", name: "branch", message: "Branch: " },
      ];
      await (async () => {
        responses = await prompts(questions);
      })();
      // Find the repo's id.
      const spinner2 = startSpinner(
        chalk`Finding your repo via {bold az repos list} ...`
      );
      const repos = await runAzCommand(["repos", "list"]);
      spinner2.stop();
      const desiredRepo = repos.find(
        (e: any) => e.name.toLowerCase() === responses.repository.toLowerCase()
      );
      if (desiredRepo === undefined) {
        throw new Error("Could not resolve repo id");
      }
      const repoId = desiredRepo.id;
      publisherInputs.repository = repoId;
      publisherInputs.branch = responses.branch;
      publisherInputs.pushedBy = ""; // Not implementing hooks for specific users yet.
      break;
  }
  body.publisherInputs = publisherInputs;

  // Save request body JSON to file, then pass file path to az devops invoke
  fs.writeFile("tmp.json", JSON.stringify(body), (err) => {
    if (err) {
      throw err;
    }
  });

  createServiceHook(body);
}

export async function createServiceHook(body: any) {
  // SEND IT

  const spinner2 = startSpinner(
    chalk`Creating service hook via {bold az devops invoke} ...`
  );
  const response = await runAzCommand(
    [
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
      JSON.stringify(body),
    ],
    { inFile: true }
  );
  console.log(response);
  spinner2.stop();

  //               ..,,:::;;iiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiii;::1ffLLLLLLLLLLL
  //              ..,,::;iiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiii;::::iiiiiiii;ii11ttttttttt
  //           .,,,:;;;;iiiiiiiiiiiiiiiiiiiiiiiiiiiiiiii:. ,:;iiiiiiiiiiiii;;;;;;;;;;
  //         .,..,:;iiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiii:. ,t1iiiiiiiiiiiiiiiiiiiiiiiii
  //            :iiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiii;,  ;C00L1iiiiiiiiiiiiiiiiiiiiiii
  //           :iiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiii;,  :tG0000Gfiiiiiiiiiiiiiiiiiiiiii
  // ::::::,,..;iiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiii:. ,tG00000000Liiiiiiiiiiiiiiiiiiiii
  // ;;;;iiii::iiiiiiiiiiiiiiiiiiiii;iiiiiiiiii;.  ;C00000000000C1iiiiiiiiiiiiiiiiiii
  // 11i;::;i;;iiiiiiiiiiiiiiii;;;iiii;iiiiii;,  :f0Ct11fC0000000G1;iiiiiiii;;;;i:;ii
  // 11111i;:;iiiiiiiiiiiiiiiiiiiiiiii:;iii;,  ,tG00i,. .,iL000000L,:iii;;;;itLCf:ii;
  // 1111111i:;iiiiiiiiiiiiiiiiiiii;;iii;:,..,:t0000t,    .:L0000C;,,;;;ifCG88@@L:;;:
  // 11111111i;iiiiiiiiiiiiiiiiiiiiiii;;;:::;ii;f000Gt:.. .:f000L;,::;tG8@@@@88Gt:;;i
  // 11111111i;iiiiiiiiiiiiiiiiiiiiiii,.:,::;;ii;f0000Cft1tLG0Gf::,,iC8@@8@80CC0C;iii
  // 11111111;;iiiiiiiiiiiiiiiiiiii;,.  :;;:;:;ii;1C00000000GLi::,iC8@88@80CG8@@81;;i
  // 1111iii;;iiiiiiiiiiiiiiiiiii;,  ..:iiii;:;iii;itCGGGCLti;:::f8@888@8CC8@@@@@8L1i
  // 1111;;;;;;;;iiiiiiiiiiiiii;.  .iLCt;;ii;;iiiiii;;i;:::,:::;L8@888@0L0@@@@@@@@8Gf
  // 1111111i;;:;iiiiiiiiiiii;,  .1C0000Gt;;iiiiiiiiiii;:;;;;;;G@8888@GC8@@@@@@@8GG08
  // 111111i;;;;:iiiiiiiiiii:.  :LGLLLCG00C1;;iiiiiiiiiiiiii;iG@888@@CC@@@@@@@0CG8@@@
  // i1111111111;;iiiiiiiii:  .1GL;,..,iL000Li;iiiiiiiiiiii;i0@888@@0C@@@@@@8CC8@@@@@
  // .,;i11111111;;iiiiiii:  ;L001,    .:f000Gi:iiiiiiiii;;;C@8888@@@@@@@@8GC8@@@@@@@
  //    .,:;iiiii;:;iiiii:  iGG00L:.    .;G000L,;iiii;::::::C8@@8@@@@@@@@0C0@@@@@@@@@
  //         ..... .:iiii: .tGGG00L1;,..,iGGGGf.:;iii;,..,. .:f88@@@@@@@CC8@@@@@@@@@@
  //                 :iii;.:;tGGGG00GCLffCGGGL:,:iiii;..f0i    L@@@@@@@@8@@@@@88@@@@@
  //                  ,:ii;ii;1LGGGGG00GGGGGf;::;ii;;, ;8t.    f@@@@@@@@@@@@@@@8@@@@@
  //                    ,;iiiii;1LGGGGGGGGLi,:;:;i1tfi .:      C@@@@@@@@@8GLC8@@@@@@@
  //                     .:iiiii;i1fLCCCCt:,:;;:1C08@0i:::::;;i0@@@@@@@0LiiG@@@@@@@@@
  //                       ,;iiiiii;iii;:,:;;;;t8@@8@@@88888@@@@@8088G1::f8@@@@@@@@@@
  //                        .:iiiiiiii;;;;iii;f8@@@@@@@@@@@@@@@@@@8Gi,,t08G0@@@@@@@@@
  //                          ,;iiiiiiiiiiii;i8@80GG@@@@@@@@@@@@@@8t:1G80G88888@@@@@@
  //                           .:iiiiiiiiiii;180CC0@@@@@@@@@@@@@@@CL08008@@888@@@@@@@
  //                             :iiiiiiiiii;;CG88@@@@@8GG0@@@@@@@@@@@@@888@@@@@@@@@@
  //                             ,iiiiiiii;:::0@@8@@8GGG0@@@@@@888@@@@@@@@@@@@@@@@@@@
}
