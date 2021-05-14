require("source-map-support").install();
import yargs = require("yargs");
import { fixYargsColors } from "./utils/YargsColors";
import { checkAz } from "./utils/AzUtils";

(async () => {
  // Check that az is configured correctly before proceeding - it's a dependency!
  await checkAz();
  
  fixYargsColors();
  yargs.strict(true)
    .scriptName("azure-devops-tools")
    .wrap(Math.min(150, yargs.terminalWidth()))
    .version(require("../package.json").version)
    .usage("Azure DevOps Tools\n\nTools that wrap the az CLI to make certain DevOps tasks a bit less painful.")
    .command(require("./vargroups/vargoups"))
    .command(require("./svc-conns/svc-conns"))
    .command(require("./logs/logs"))
    .help()
    .demandCommand(2)
    .argv;
})();