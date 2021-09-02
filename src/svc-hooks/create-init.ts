import chalk from "chalk";
import * as fs from "fs";
import { join } from "path";
import * as YAML from "yaml";
import { Scalar } from "yaml/types";

class ValWithComment {
  // Required for adding comments to YAML file
  constructor(public value: any, public comment: string) {}
}
const commentYamlTag = {
  // Required for adding comments to YAML file
  identify: (value: any) => value instanceof ValWithComment,
  tag: "",
  createNode: (_schema: any, v: ValWithComment, _ctx: any) => {
    const n = new Scalar(v.value);
    n.comment = v.comment;
    return n;
  },
  resolve(_doc: any, _cst: any) {
    throw Error("not for parsing, just stringify!");
  },
};

export const command = "create-init [options]";
export const desc = "Initialize template YAML file for creating service hooks";
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
        pipelineName: new ValWithComment(null, " '' | <pipeline-name>"),
        buildStatus: new ValWithComment(
          null,
          " '' | Succeeded | PartiallySucceeded | Failed | Stopped"
        ),
        acceptUntrustedCerts: new ValWithComment(true, " true | false"),
        publisherId: "tfs",
      },
    },
    {
      org: null,
      project: null,
      eventType: "ms.vss-pipelines.stage-state-changed-event",
      url: null,
      eventSpecificArgs: {
        buildDefinitionId: new ValWithComment(
          null,
          " <defintionId-as-string-from-pipeline-link>"
        ),
        stageNameId: new ValWithComment("", " '' | __default "),
        stageStateId: new ValWithComment(
          "",
          " '' | NotStarted | Waiting | Running | Completed"
        ),
        stageResultId: "",
        acceptUntrustedCerts: new ValWithComment(true, " true | false"),
        publisherId: "pipelines",
      },
    },
    {
      org: null,
      project: null,
      eventType: "git.push",
      url: null,
      eventSpecificArgs: {
        repoName: new ValWithComment(null, " '' | <repo-name>"),
        branch: new ValWithComment("", " '' | <branch-name>"),
        pushedBy: "",
        acceptUntrustedCerts: new ValWithComment(true, " true | false"),
        publisherId: "tfs",
      },
    },
  ];

  // Write sample to output file
  const fPath = join(argv.outDir, "create.yaml");
  if (!fs.existsSync(argv.outDir)) {
    fs.mkdirSync(argv.outDir);
  }

  // Format the output data correctly, depending on file type
  fs.writeFileSync(
    fPath,
    YAML.stringify(sampleJSON, { customTags: [commentYamlTag] })
  ); // customTags required for adding comments into YAML file
  console.log(chalk.green`Template YAML at`, chalk.dim.underline`${fPath}`);
}
