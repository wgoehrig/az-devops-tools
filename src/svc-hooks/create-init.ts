import * as fs from "fs";
import { join } from "path";
import * as YAML from "yaml";

export const command = "create-init";
export const desc = "Initialize the YAML file for creating service hooks";
export const builder = (yargs: import("yargs").Argv) =>
  yargs.option("outDir", {
    alias: "o",
    default: ".",
    describe: "Directory to write output file to",
    type: "string",
    normalize: true,
  });
export function handler(argv: any) {
  // Some dummy data to output for user to fill in.
  const sampleJSON = [
    {
      org: null,
      project: null,
      eventType: "build.complete",
      url: null,
      eventSpecificArgs: {
        pipelineName: "'' | <pipeline-name>",
        buildStatus: "'' | Succeeded | PartiallySucceeded | Failed | Stopped",
        acceptUntrustedCerts: true,
        publisherId: "tfs",
      },
    },
    {
      org: null,
      project: null,
      eventType: "ms.vss-pipelines.stage-state-changed-event",
      url: null,
      eventSpecificArgs: {
        buildDefinitionId: "'<defintionId-as-string-from-pipeline-link>'",
        stageNameId: "'' | __default ",
        stageStateId: "'' | NotStarted | Waiting | Running | Completed",
        stageResultId: "",
        acceptUntrustedCerts: true,
        publisherId: "pipelines",
      },
    },
    {
      org: null,
      project: null,
      eventType: "git.push",
      url: null,
      eventSpecificArgs: {
        repoName: "'' | <repo-name>",
        branch: "'' | <branch-name>",
        pushedBy: "",
        acceptUntrustedCerts: true,
        publisherId: "tfs",
      },
    },
  ];

  // Write sample to output file
  const fPath = join(argv.outDir, `create.yaml`);
  if (!fs.existsSync(argv.outDir)) {
    fs.mkdirSync(argv.outDir);
  }

  // Format the output data correctly, depending on file type
  fs.writeFileSync(fPath, YAML.stringify(sampleJSON));
}
