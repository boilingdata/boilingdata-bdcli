import * as cmd from "commander";
import { getLogger } from "../../utils/logger_util.js";
import { spinnerError, spinnerSuccess, updateSpinnerText } from "../../utils/spinner_util.js";
import { addGlobalOptions } from "../../utils/options_util.js";
import { combineOptsWithSettings, hasValidConfig, profile } from "../../utils/config_util.js";
import { getIdToken } from "../../utils/auth_util.js";
import { BDSandbox } from "../../../integration/boilingdata/sandbox.js";
import { outputResults } from "../../utils/output_util.js";
const logger = getLogger("bdcli-sandbox-destroy");
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
        updateSpinnerText(`Destroying sandbox ${options.name}`);
        const bdSandbox = new BDSandbox({ logger, authToken: token });
        const results = await bdSandbox.destroySandbox(options.name, options.destroyAlsoInterfaces, options.deleteTemplate);
        spinnerSuccess();
        await outputResults(results?.destroyResults, options.disableSpinner);
    }
    catch (err) {
        spinnerError(err?.message);
    }
}
const program = new cmd.Command("bdcli sandbox destroy")
    .addOption(new cmd.Option("--name <sandboxName>", "sandbox name").makeOptionMandatory())
    .addOption(new cmd.Option("--destroy-also-interfaces", "Also delete interfaces like Tap URLs"))
    .addOption(new cmd.Option("--delete-template", "Finally, delete template if all resources were destroyed, including interfaces"))
    .addOption(new cmd.Option("--region <region>", "AWS region (by default eu-west-1").default("eu-west-1"))
    .action(async (options, command) => await show(options, command));
(async () => {
    await addGlobalOptions(program, logger);
    await program.parseAsync(process.argv);
})();
