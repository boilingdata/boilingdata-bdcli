import * as cmd from "commander";
import { getLogger } from "../../utils/logger_util.js";
import { spinnerError, spinnerSuccess, updateSpinnerText } from "../../utils/spinner_util.js";
import { addGlobalOptions } from "../../utils/options_util.js";
import { getIdToken, setupMfa } from "../../utils/auth_util.js";
const logger = getLogger("bdcli-account-enable-mfa");
async function show(_options, _command) {
    try {
        updateSpinnerText("Authenticating");
        const { cached } = await getIdToken(logger);
        updateSpinnerText(cached ? "Authenticating: cached" : "Authenticating: success");
        spinnerSuccess();
        try {
            updateSpinnerText("Setting up MFA");
            await setupMfa(logger);
            spinnerSuccess();
        }
        catch (err) {
            logger.debug({ err });
            spinnerError(err?.message);
        }
        return;
    }
    catch (err) {
        spinnerError(err?.message);
    }
}
const program = new cmd.Command("bdcli account enable-mfa").action(async (options, command) => await show(options, command));
addGlobalOptions(program, logger);
(async () => await program.parseAsync(process.argv))();
