import * as cmd from "commander";
import { getLogger } from "../../utils/logger_util.js";
import { spinnerError, spinnerSuccess } from "../../utils/spinner_util.js";
import { addGlobalOptions } from "../../utils/options_util.js";
import { combineOptsWithSettings, getCachedTokenSessions } from "../../utils/config_util.js";
import { outputResults } from "../../utils/output_util.js";
import { authSpinnerWithConfigCheck } from "../../utils/auth_util.js";

const logger = getLogger("bdcli-account-token-list-sessions");

async function show(options: any, _command: cmd.Command): Promise<void> {
  try {
    options = await combineOptsWithSettings(options, logger);

    if (!authSpinnerWithConfigCheck()) return;
    const list = await getCachedTokenSessions(logger, options.showExpired);
    spinnerSuccess();
    await outputResults(list, options.disableSpinner);
  } catch (err: any) {
    spinnerError(err?.message);
  }
}

const program = new cmd.Command("bdcli account token-list-sessions")
  .addOption(new cmd.Option("--show-expired", "Do not filter expired cached sessions (vended tokens)"))
  .action(async (options, command) => await show(options, command));

(async () => {
  await addGlobalOptions(program, logger);
  await program.parseAsync(process.argv, { from: "user" });
})();
