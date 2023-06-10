import * as cmd from "commander";
import { getLogger } from "../../utils/logger_util.js";
import { spinnerError, spinnerSuccess, spinnerWarn, updateSpinnerText } from "../../utils/spinner_util.js";
import { addGlobalOptions } from "../../utils/options_util.js";
import { updateConfig } from "../../utils/config_util.js";

const logger = getLogger("bdcli-setup-account");

async function show(options: any, _command: cmd.Command): Promise<void> {
  try {
    logger.debug({ options });

    if (!options.createConfigOnly) {
      updateSpinnerText("Please register on https://app.boilingdata.com/");
      spinnerWarn("Please register on https://app.boilingdata.com/");
      return;
    }

    updateSpinnerText("Updating ~/.bdclirc");
    const { email, password } = options;
    await updateConfig({ credentials: { email, password } });
    spinnerSuccess();
  } catch (err: any) {
    spinnerError(err?.message);
  }
}

const program = new cmd.Command("bdcli setup account")
  .addOption(new cmd.Option("--email <email>", "email address that works").makeOptionMandatory())
  .addOption(new cmd.Option("--password <password>", "suitably complex password").makeOptionMandatory())
  .addOption(new cmd.Option("--create-config-only", "Only store credentials into ~/.bdclirc configuration file"))
  .action(async (options, command) => await show(options, command));

addGlobalOptions(program, logger);

(async () => await program.parseAsync(process.argv))();
