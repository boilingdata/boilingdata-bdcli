import * as cmd from "commander";
import { ELogLevel, getLogger } from "../../utils/logger_util.js";
import { spinnerError, spinnerSuccess, updateSpinnerText } from "../../utils/spinner_util.js";
import { addGlobalOptions } from "../../utils/options_util.js";
import { getIdToken } from "../../utils/auth_util.js";
import { combineOptsWithSettings } from "../../utils/config_util.js";
import { getSignedWssUrl } from "../../../integration/aws/sign-wss-url.js";
import { outputResults } from "../../utils/output_util.js";
const logger = getLogger("bdcli-api");
logger.setLogLevel(ELogLevel.WARN);
async function wssurl(options, _command) {
    try {
        options = await combineOptsWithSettings(options, logger);
        updateSpinnerText("Authenticating");
        const { idToken: token, cached, region } = await getIdToken(logger);
        updateSpinnerText(cached ? "Authenticating: cached" : "Authenticating: success");
        spinnerSuccess();
        updateSpinnerText("Getting signed WebSocket URL (ws://)");
        const signedUrl = await getSignedWssUrl(logger, token, region);
        spinnerSuccess();
        await outputResults(signedUrl, options.disableSpinner);
    }
    catch (err) {
        spinnerError(err?.message);
    }
}
const program = new cmd.Command("bdcli api wssurl").action(async (options, command) => await wssurl(options, command));
(async () => {
    await addGlobalOptions(program, logger);
    await program.parseAsync(process.argv);
})();
