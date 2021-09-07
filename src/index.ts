import "source-map-support/register.js";
import { createRequire } from "module";
const require = createRequire(import.meta.url);

import yargs from "yargs";
import { fixYargsColors } from "./utils/YargsColors.js";
import { checkAz } from "./utils/AzUtils.js";

// Now that we've moved to ES modules, we'll just assume that require.main is only ever set when the worker-farm spawned this process.
// NB: This will break if worker-farm is ever updated to support ES modules!
if (!require.main) {
  // Check that az is configured correctly before proceeding - it's a dependency!
  await checkAz();

  const yargsInstance = yargs(process.argv.slice(2), process.cwd());
  fixYargsColors(yargsInstance);
  yargsInstance.strict(true)
    .scriptName("az-devops-tools")
    .wrap(Math.min(150, yargsInstance.terminalWidth()))
    .version(require("../package.json").version)
    .usage("Azure DevOps Tools\n\nTools that wrap the az CLI to make certain DevOps tasks a bit less painful.")
    .command(await import("./vargroups/vargroups.js"))
    .command(await import("./svc-conns/svc-conns.js"))
    .command(await import("./svc-hooks/svc-hooks.js"))
    .command(await import("./logs/logs.js"))
    .help()
    .demandCommand(2)
    .argv;
}

export { runAzInWorker } from "./utils/AzUtils.js";
