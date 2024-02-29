import * as cmd from "commander";
import { getLogger } from "../../utils/logger_util.js";
import { spinnerError, spinnerSuccess, spinnerWarn, updateSpinnerText } from "../../utils/spinner_util.js";
import { addGlobalOptions } from "../../utils/options_util.js";
import { combineOptsWithSettings, hasValidConfig, profile } from "../../utils/config_util.js";
import { BDSandbox } from "../../../integration/boilingdata/sandbox.js";
import { getIdToken } from "../../utils/auth_util.js";
import { outputResults } from "../../utils/output_util.js";
const logger = getLogger("bdcli-sandbox-list");
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
        updateSpinnerText("Listing sandboxes");
        const bdSandbox = new BDSandbox({ logger, authToken: token });
        const list = await bdSandbox.listSandboxes(options.listDeleted, options.listVersions);
        spinnerSuccess();
        await outputResults(list, options.disableSpinner);
    }
    catch (err) {
        if (err?.message.includes("Busy to"))
            return spinnerWarn("Deployment busy, try again");
        spinnerError(err?.message);
    }
}
const program = new cmd.Command("bdcli sandbox list")
    .addOption(new cmd.Option("--region <region>", "AWS region (by default eu-west-1").default("eu-west-1"))
    .addOption(new cmd.Option("--list-deleted", "List also deleted templates"))
    .addOption(new cmd.Option("--list-versions", "List all template versions"))
    .action(async (options, command) => await show(options, command));
(async () => {
    await addGlobalOptions(program, logger);
    await program.parseAsync(process.argv);
})();
