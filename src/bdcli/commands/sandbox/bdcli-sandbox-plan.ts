import * as cmd from "commander";
import { getLogger } from "../../utils/logger_util.js";
import { spinnerError, spinnerWarn, updateSpinnerText } from "../../utils/spinner_util.js";
import { addGlobalOptions } from "../../utils/options_util.js";
import { combineOptsWithSettings, hasValidConfig, profile } from "../../utils/config_util.js";

const logger = getLogger("bdcli-sandbox-plan");

async function show(options: any, _command: cmd.Command): Promise<void> {
  try {
    options = await combineOptsWithSettings(options, logger);

    if (!(await hasValidConfig())) {
      return spinnerError(`No valid bdcli configuration found for "${profile}" profile`);
    }

    console.log(options.region);
    updateSpinnerText("TODO: Planning updates for deployment");

    spinnerWarn();
  } catch (err: any) {
    spinnerError(err?.message);
  }
}

const program = new cmd.Command("bdcli sandbox plan")
  .addOption(new cmd.Option("--template <templateFile>", "sandbox IaC file").makeOptionMandatory())
  .addOption(new cmd.Option("--region <region>", "AWS region (by default eu-west-1").default("eu-west-1"))
  .action(async (options, command) => await show(options, command));

(async () => {
  await addGlobalOptions(program, logger);
  await program.parseAsync(process.argv);
})();
