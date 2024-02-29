import * as cmd from "commander";
import { getLogger } from "../../utils/logger_util.js";
import { spinnerError, spinnerSuccess, spinnerWarn, updateSpinnerText } from "../../utils/spinner_util.js";
import { addGlobalOptions } from "../../utils/options_util.js";
import { combineOptsWithSettings, hasValidConfig, profile } from "../../utils/config_util.js";
import { getIdToken } from "../../utils/auth_util.js";
import { BDSandbox } from "../../../integration/boilingdata/sandbox.js";
import { outputResults } from "../../utils/output_util.js";
const logger = getLogger("bdcli-sandbox-validate");
async function show(options, _command) {
    try {
        options = await combineOptsWithSettings(options, logger);
        if (!(await hasValidConfig())) {
            return spinnerError(`No valid bdcli configuration found for "${profile}" profile`);
        }
        updateSpinnerText("Authenticating");
        const { idToken: token, cached: idCached } = await getIdToken(logger);
        updateSpinnerText(`Authenticating: ${idCached ? "cached" : "success"}`);
        spinnerSuccess();
        updateSpinnerText("Validating sandbox IaC template");
        const bdSandbox = new BDSandbox({ logger, authToken: token });
        await bdSandbox.validateTemplate(options.template, options.warningsAsErrors);
        spinnerSuccess();
    }
    catch (origErr) {
        // try to decode the message
        try {
            spinnerError(origErr?.message, false);
            await outputResults(JSON.parse(origErr?.message)
                ?.message?.split(";")
                ?.map((msg) => msg.trim()), false);
        }
        catch (err) {
            if (err?.message.includes("Busy to"))
                return spinnerWarn("Deployment busy, try again");
            if (err?.message && !origErr?.message)
                spinnerError(err?.message, false);
        }
    }
}
const program = new cmd.Command("bdcli sandbox validate")
    .addOption(new cmd.Option("--template <templateFile>", "sandbox IaC file").makeOptionMandatory())
    .addOption(new cmd.Option("--warnings-as-errors", "Treat any warning as an error"))
    .action(async (options, command) => await show(options, command));
(async () => {
    await addGlobalOptions(program, logger);
    await program.parseAsync(process.argv);
})();
