require("source-map-support").install();
require('yargonaut')
  .style('green')
  .style('yellow', "required")
  .style('cyan', "Positionals:")
  .helpStyle('cyan')
  .errorsStyle('red.bold');
import yargs = require("yargs");
import { checkAz } from "./utils/AzUtils";

(async () => {
  // Check that az is configured correctly before proceeding - it's a dependency!
  await checkAz();
  
  yargs.strict(true)
    .wrap(Math.min(150, yargs.terminalWidth()))
    .version("2.0.0")
    .usage("Azure DevOps Tools\n\n Tools to make certain tasks suck less.")
    .command(require("./vargroups/vargoups"))
    .help()
    .demandCommand(2)
    .argv;
})();