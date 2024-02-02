import * as cmd from "commander";
import { getLogger } from "../../utils/logger_util.js";
import { spinnerError, spinnerSuccess, updateSpinnerText } from "../../utils/spinner_util.js";
import { addGlobalOptions } from "../../utils/options_util.js";
import { getIdToken, validateTokenLifetime } from "../../utils/auth_util.js";
import { BDAccount } from "../../../integration/boilingdata/account.js";
import { combineOptsWithSettings } from "../../utils/config_util.js";
import { outputResults } from "../../utils/output_util.js";
const logger = getLogger("bdcli-account-token");
async function show(options, _command) {
    try {
        options = await combineOptsWithSettings(options, logger);
        if (options.lifetime)
            await validateTokenLifetime(options.lifetime);
        updateSpinnerText("Authenticating");
        const { idToken: token, cached: idCached, region } = await getIdToken(logger);
        updateSpinnerText(`Authenticating: ${idCached ? "cached" : "success"}`);
        spinnerSuccess();
        updateSpinnerText(`Getting BoilingData TAP token`);
        if (!region)
            throw new Error("Pass --region parameter or set AWS_REGION env");
        const bdAccount = new BDAccount({ logger, authToken: token });
        const { bdTapToken, cached: tapCached, ...rest } = await bdAccount.getTapToken(options.lifetime ?? "24h", options.sharingUser);
        updateSpinnerText(`Getting BoilingData TAP token: ${tapCached ? "cached" : "success"}`);
        spinnerSuccess();
        await outputResults({ bdTapToken, cached: tapCached, ...rest }, options.disableSpinner);
    }
    catch (err) {
        spinnerError(err?.message);
    }
}
const program = new cmd.Command("bdcli account tap-token")
    .addOption(new cmd.Option("--lifetime <lifetime>", "Expiration lifetime for the token, in string format, like '1h' (see https://github.com/vercel/ms)"))
    .addOption(new cmd.Option("--sharing-user <emailOfTapSharingUser>", "A user has shared Tap for you so that you can write to it."))
    .action(async (options, command) => await show(options, command));
(async () => {
    await addGlobalOptions(program, logger);
    await program.parseAsync(process.argv);
})();
