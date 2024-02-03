import * as cmd from "commander";
import { getLogger } from "../../utils/logger_util.js";
import { spinnerError, spinnerSuccess, updateSpinnerText } from "../../utils/spinner_util.js";
import { addGlobalOptions } from "../../utils/options_util.js";
import { combineOptsWithSettings, hasValidConfig, profile } from "../../utils/config_util.js";
import { BDSandbox } from "../../../integration/boilingdata/sandbox.js";
import { getIdToken } from "../../utils/auth_util.js";
import { outputResults } from "../../utils/output_util.js";
const logger = getLogger("bdcli-sandbox-deploy");
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
        updateSpinnerText(`Deploying sandbox ${options.name}`);
        const bdSandbox = new BDSandbox({ logger, authToken: token });
        const results = await bdSandbox.deploySandbox(options.name);
        spinnerSuccess();
        await outputResults(results?.deployResults, options.disableSpinner);
    }
    catch (err) {
        spinnerError(err?.message);
    }
}
const program = new cmd.Command("bdcli sandbox deploy")
    .addOption(new cmd.Option("--name <sandboxName>", "sandbox name").makeOptionMandatory())
    .action(async (options, command) => await show(options, command));
(async () => {
    await addGlobalOptions(program, logger);
    await program.parseAsync(process.argv);
})();