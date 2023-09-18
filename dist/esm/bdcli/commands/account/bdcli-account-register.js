import * as cmd from "commander";
import { getLogger } from "../../utils/logger_util.js";
import { spinnerError, spinnerSuccess, updateSpinnerText } from "../../utils/spinner_util.js";
import { addGlobalOptions } from "../../utils/options_util.js";
import { combineOptsWithSettings, hasValidConfig } from "../../utils/config_util.js";
import { registerToBoilingData } from "../../utils/auth_util.js";
const logger = getLogger("bdcli-account-register");
async function show(options, _command) {
    try {
        options = await combineOptsWithSettings(options, logger);
        if (options.environment != "preview" || options.region != "eu-west-1") {
            return spinnerError("Currently only preview environment is supported, and userpool registration on eu-west-1 AWS region. " +
                "Migration to other regions and production environment(s) will be supported in the future.");
        }
        updateSpinnerText("Registering to BoilingData");
        const { region, environment, password, email } = options;
        await registerToBoilingData(region, environment, email, password, logger);
        if (!(await hasValidConfig()))
            return spinnerError("No valid config, was registration successful?");
        spinnerSuccess();
    }
    catch (err) {
        spinnerError(err?.message);
    }
}
const program = new cmd.Command("bdcli account register")
    .addOption(new cmd.Option("--email <email>", "email address that works"))
    .addOption(new cmd.Option("--password <password>", "suitably complex password, at least 12 characters"))
    .addOption(new cmd.Option("--region <region>", "AWS region (by default eu-west-1").default("eu-west-1"))
    .addOption(new cmd.Option("--environment <environment>", "'production' or 'preview' (default)").default("preview"))
    .action(async (options, command) => await show(options, command));
(async () => {
    await addGlobalOptions(program, logger);
    await program.parseAsync(process.argv);
})();
