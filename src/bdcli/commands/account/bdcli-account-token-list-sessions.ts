import * as cmd from "commander";
import { getLogger } from "../../utils/logger_util.js";
import { spinnerError, spinnerSuccess, updateSpinnerText } from "../../utils/spinner_util.js";
import { addGlobalOptions } from "../../utils/options_util.js";
// import { getIdToken } from "../../utils/auth_util.js";
// import { BDAccount } from "../../../integration/boilingdata/account.js";
import { combineOptsWithSettings, getCachedTokenSessions } from "../../utils/config_util.js";

const logger = getLogger("bdcli-account-token-list-sessions");

async function show(options: any, _command: cmd.Command): Promise<void> {
  try {
    options = await combineOptsWithSettings(options);
    logger.debug({ options });

    // updateSpinnerText("Authenticating");
    // const { idToken: token, cached: idCached, region: region } = await getIdToken(logger);
    // updateSpinnerText(`Authenticating: ${idCached ? "cached" : "success"}`);
    // spinnerSuccess();

    updateSpinnerText("Listing token cached/local sessions");
    // if (!region) throw new Error("Pass --region parameter or set AWS_REGION env");
    const list = await getCachedTokenSessions(logger, options.showExpired);
    spinnerSuccess();
    console.log(JSON.stringify(list));
  } catch (err: any) {
    spinnerError(err?.message);
  }
}

const program = new cmd.Command("bdcli account token-list-sessions")
  .addOption(new cmd.Option("--show-expired", "Do not filter expired cached sessions (vended tokens)"))
  .action(async (options, command) => await show(options, command));

(async () => {
  await addGlobalOptions(program, logger);
  await program.parseAsync(process.argv, { from: "user" });
})();
