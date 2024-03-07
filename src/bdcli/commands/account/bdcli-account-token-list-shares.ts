import * as cmd from "commander";
import { getLogger } from "../../utils/logger_util.js";
import { spinnerError, spinnerSuccess, updateSpinnerText } from "../../utils/spinner_util.js";
import { addGlobalOptions } from "../../utils/options_util.js";
import { authSpinnerWithConfigCheck, getIdToken } from "../../utils/auth_util.js";
import { BDAccount } from "../../../integration/boilingdata/account.js";
import { combineOptsWithSettings } from "../../utils/config_util.js";
import { outputResults } from "../../utils/output_util.js";

const logger = getLogger("bdcli-account-token-list-shares");

async function show(options: any, _command: cmd.Command): Promise<void> {
  try {
    options = await combineOptsWithSettings(options, logger);

    if (!authSpinnerWithConfigCheck()) return;
    const { idToken: token, cached: idCached, region: region } = await getIdToken(logger);
    updateSpinnerText(`Authenticating: ${idCached ? "cached" : "success"}`);
    spinnerSuccess();

    updateSpinnerText("Listing token shares");
    if (!region) throw new Error("Pass --region parameter or set AWS_REGION env");
    const bdAccount = new BDAccount({ logger, authToken: token });
    const list = await bdAccount.listSharedTokens();
    spinnerSuccess();
    await outputResults(list, options.disableSpinner);
  } catch (err: any) {
    spinnerError(err?.message);
  }
}

const program = new cmd.Command("bdcli account token-list-shares").action(
  async (options, command) => await show(options, command),
);

(async () => {
  await addGlobalOptions(program, logger);
  await program.parseAsync(process.argv, { from: "user" });
})();
