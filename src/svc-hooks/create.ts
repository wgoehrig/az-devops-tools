// https://docs.microsoft.com/en-us/azure/devops/service-hooks/create-subscription?view=azure-devops#create-a-subscription-for-a-project

import * as fs from "fs";
import * as path from "path";
import { runAzCommand } from "../utils/AzUtils";
import { startSpinner } from "../utils/MiscUtils";
import { printTable } from "../utils/TableUtils";

import chalk = require("chalk");

export const command =
  "create <repo> <branch> <event> <url> [user.name user.password] [headers] [level]";
export const desc = "Create a service hook for a proj";
export const builder = (yargs: import("yargs").Argv) =>
  yargs
    // Repository, branch, event, POST URL, HTTP headers (optional), user (optional), resource details to send {All | Minimal | None}.
    .positional("repo", {
      describe: "Repository to add webhook on",
      type: "string",
    })
    .positional("branch", {
      describe: "Branch trigger",
      type: "string",
    })
    .positional("event", {
      describe: "Event trigger",
      type: "string",
    })
    .positional("url", {
      describe: "URL to POST to",
      type: "string",
    })
    .coerce("url", (url: string) => {
      // Chcek if valid URL.
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
      describe:
        "Basic auth for webhook. Use --user.name and --user.password",
    })
    .coerce("user", (user: string[]) => {
      // Check if name and password are provided.
      if (user !== undefined && "name" in user && "password" in user) {
        return user;
      } else {
        throw new Error("Could not read user. Example: --user.name=Batman --user.password=WhereIsShe?");
      }
    })
    .option("headers", {
      alias: "H",
      describe: "HTTP headers to send with the webhook's POST request",
      type: "string",
    })
    .option("headers-file", {
      alias: "F",
      describe: "File containing HTTP headers to send with the webhook's POST request",
      type: "string",
    })
    // .coerce("headers-file", async (headersFile: string) => {
    //   // Check if file exists.
    //   if (fs.existsSync(headersFile)) {
    //     console.log(JSON.parse( await fs.readFileSync(headersFile, "utf8")));
    //   } else {
    //     throw new Error(`File ${headersFile} does not exist.`);
    //   }
    // })
    .option("level", {
      alias: "l",
      describe: "Resource details to send",
      default: "all",
      choices: ["all", "minimal", "none"],
      type: "string",
    });
export function handler(argv: any) {
  // Search the projectId of the project we'd like to create a hook for.

  // Determine the event ID and settings

  // Determine consumer and action IDs and settings

  // Create the webhook

  console.log(argv);
}

export async function createServiceHook() {
  console.log("TO BE IMPLEMENTED");
}
