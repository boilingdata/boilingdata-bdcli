import * as cmd from "commander";
import { ELogLevel, getLogger } from "../../utils/logger_util.js";
import { spinnerError, spinnerSuccess, spinnerWarn, updateSpinnerText } from "../../utils/spinner_util.js";
import { addGlobalOptions } from "../../utils/options_util.js";
import { authSpinnerWithConfigCheck, getIdToken } from "../../utils/auth_util.js";
import { combineOptsWithSettings } from "../../utils/config_util.js";

const logger = getLogger("bdcli-domain");
logger.setLogLevel(ELogLevel.WARN);

async function iamrole(options: any, _command: cmd.Command): Promise<void> {
  try {
    options = await combineOptsWithSettings(options, logger);

    if (options.delete) {
      updateSpinnerText("Not implemented yet. Please delete the IAM Role from AWS Console");
      spinnerWarn("Not implemented yet. Please delete the IAM Role from AWS Console");
      return;
    }

    if (!authSpinnerWithConfigCheck()) return;
    const { cached, region } = await getIdToken(logger);
    if (!region) throw new Error("Pass --region parameter or set AWS_REGION env");
    updateSpinnerText(cached ? "Authenticating: cached" : "Authenticating: success");
    spinnerSuccess();

    updateSpinnerText("TODO: Manage domain");
    spinnerSuccess();
  } catch (err: any) {
    spinnerError(err?.message);
  }
}

const program = new cmd.Command("bdcli domain setup")
  .addOption(
    new cmd.Option(
      "--domain <domain>",
      "Initiate your domain setup in BoilingData (to be implemented)",
    ).makeOptionMandatory(),
  )
  .action(async (options, command) => await iamrole(options, command));

(async () => {
  await addGlobalOptions(program, logger);
  await program.parseAsync(process.argv);
})();
