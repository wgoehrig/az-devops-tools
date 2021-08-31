import * as fs from "fs";
import { join } from "path";


const YAML = require("json2yaml");


export const command = "create-init";
export const desc = "Initialize the YAML file for creating service hooks";
export const builder = (yargs: import("yargs").Argv) =>
  yargs
    .option("outDir", {
      alias: "o",
      default: ".",
      describe: "Directory to write output file to",
      type: "string",
      normalize: true
    })
    .option("outType", {
      alias: "t",
      default: "yaml",
      describe: "Output file type",
      type: "string",
      choices: ["yaml", "json"]
    });
export function handler(argv: any) {
  const sampleJSON = [
    {
      "org": null,
      "project": null,
      "eventType": "build.complete",
      "url": null,
      "eventSpecificArgs": {
        "definitionName": null,
        "buildStatus": null,
        "publisherId": "tfs"
      }
    },
    {
      "org": null,
      "project": null,
      "eventType": "ms.vss-pipelines.stage-state-changed-event",
      "url": null,
      "eventSpecificArgs": {
        "pipelineId": null,
        "stageNameId": null,
        "stageStateId": null,
        "publisherId": "pipelines"
      }
    },
    {
      "org": null,
      "project": null,
      "eventType": "git.push",
      "url": null,
      "eventSpecificArgs": {
        "repoName": null,
        "branch": null,
        "pushedBy": null,
        "publisherId": "tfs"
      }
    }
  ];

  // Write sample to output file
  const fPath = join(argv.outDir, `create.${argv.outType === "yaml" ? "yml" : "json"}`);
  if (!fs.existsSync(argv.outDir)) {
    fs.mkdirSync(argv.outDir);
  }
  if (argv.outType === "yaml") {
    fs.writeFileSync(fPath, YAML.stringify(sampleJSON));
  } else {
    fs.writeFileSync(fPath, JSON.stringify(sampleJSON, null, 2));
  }

}