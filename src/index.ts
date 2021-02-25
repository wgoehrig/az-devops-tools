require("source-map-support").install();
require('yargonaut')
  .style('green')
  .style('yellow', "required")
  .style('cyan', "Positionals:")
  .helpStyle('cyan')
  .errorsStyle('red.bold');
import yargs = require("yargs");

(async () => {  
  yargs.strict(true)
    .wrap(Math.min(150, yargs.terminalWidth()))
    .version("2.0.0")
    .usage("Azure DevOps Tools\n\n Tools to make certain tasks suck less.")
    .command(require("./vargroups/vargoups"))
    .help()
    .demandCommand(2)
    .argv;
})();