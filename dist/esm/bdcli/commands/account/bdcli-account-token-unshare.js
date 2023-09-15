import * as cmd from "commander";
import { getLogger } from "../../utils/logger_util.js";
import { spinnerError, spinnerSuccess, updateSpinnerText } from "../../utils/spinner_util.js";
import { addGlobalOptions } from "../../utils/options_util.js";
import { getIdToken } from "../../utils/auth_util.js";
import { BDAccount } from "../../../integration/boilingdata/account.js";
const logger = getLogger("bdcli-account-token-unshare");
async function show(options, _command) {
    try {
        logger.debug({ options });
        if (options.id.length != 40)
            throw new Error("Invalid share id");
        updateSpinnerText("Authenticating");
        const { idToken: token, cached: idCached, region } = await getIdToken(logger);
        updateSpinnerText(`Authenticating: ${idCached ? "cached" : "success"}`);
        spinnerSuccess();
        updateSpinnerText("Unsharing token");
        if (!region)
            throw new Error("Pass --region parameter or set AWS_REGION env");
        const bdAccount = new BDAccount({ logger, authToken: token });
        await bdAccount.unshareToken(options.id);
        spinnerSuccess();
    }
    catch (err) {
        spinnerError(err?.message);
    }
}
const program = new cmd.Command("bdcli account token-unshare")
    .addOption(new cmd.Option("--id <share-id>", "Shared token id to delete (see token-list)").makeOptionMandatory())
    .action(async (options, command) => await show(options, command));
(async () => {
    await addGlobalOptions(program, logger);
    await program.parseAsync(process.argv);
})();
