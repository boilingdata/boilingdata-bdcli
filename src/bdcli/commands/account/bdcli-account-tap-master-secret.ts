import * as cmd from "commander";
import { getLogger } from "../../utils/logger_util.js";
import { spinnerError, spinnerSuccess, updateSpinnerText } from "../../utils/spinner_util.js";
import { addGlobalOptions } from "../../utils/options_util.js";
import { authSpinnerWithConfigCheck, getIdToken, validateTokenLifetime } from "../../utils/auth_util.js";
import { BDAccount } from "../../../integration/boilingdata/account.js";
import { combineOptsWithSettings } from "../../utils/config_util.js";
import { outputResults } from "../../utils/output_util.js";

const logger = getLogger("bdcli-account-tap-master-secret");

async function show(options: any, _command: cmd.Command): Promise<void> {
  try {
    options = await combineOptsWithSettings(options, logger);
    if (options.lifetime) await validateTokenLifetime(options.lifetime);

    if (!authSpinnerWithConfigCheck()) return;
    const { idToken: token, cached: idCached, region } = await getIdToken(logger);
    updateSpinnerText(`Authenticating: ${idCached ? "cached" : "success"}`);
    spinnerSuccess();

    updateSpinnerText(`Getting BoilingData Master TAP secret`);
    if (!region) throw new Error("Pass --region parameter or set AWS_REGION env");
    const bdAccount = new BDAccount({ logger, authToken: token });
    const { bdTapMasterSecret, cached: tapCached, ...rest } = await bdAccount.getTapMasterSecret(options?.application);
    updateSpinnerText(`Getting BoilingData Master TAP secret: ${tapCached ? "cached" : "success"}`);
    spinnerSuccess();
    await outputResults({ bdTapMasterSecret, cached: tapCached, ...rest }, options.disableSpinner);
  } catch (err: any) {
    spinnerError(err?.message);
  }
}

const program = new cmd.Command("bdcli account tap-master-secret")
  .addOption(
    new cmd.Option(
      "--sharing-user <emailOfTapSharingUser>",
      "A user has shared Tap for you so that you can write to it.",
    ),
  )
  .addOption(new cmd.Option("--application <application>", "Data Taps supported application name, like 'github'"))
  .action(async (options, command) => await show(options, command));

(async () => {
  await addGlobalOptions(program, logger);
  await program.parseAsync(process.argv);
})();
