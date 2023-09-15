import * as cmd from "commander";
import { getLogger } from "../../utils/logger_util.js";
import { spinnerError, spinnerWarn } from "../../utils/spinner_util.js";
import { addGlobalOptions } from "../../utils/options_util.js";
const logger = getLogger("bdcli-account-migrate");
async function show(options, _command) {
    try {
        logger.debug({ options: { ...options, password: options.password ? "**" : undefined } });
        spinnerWarn("Not supported yet.");
    }
    catch (err) {
        spinnerError(err?.message);
    }
}
const program = new cmd.Command("bdcli account migrate")
    .addOption(new cmd.Option("--region <region>", "AWS region (by default eu-west-1").default("eu-west-1"))
    .addOption(new cmd.Option("--environment <environment>", "'production' or 'test' (default)").default("test"))
    .action(async (options, command) => await show(options, command));
(async () => {
    await addGlobalOptions(program, logger);
    await program.parseAsync(process.argv);
})();
