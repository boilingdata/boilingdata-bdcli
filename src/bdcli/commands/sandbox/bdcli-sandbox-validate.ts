import * as cmd from "commander";
import { getLogger } from "../../utils/logger_util.js";
import { spinnerError, spinnerSuccess, spinnerWarn, updateSpinnerText } from "../../utils/spinner_util.js";
import { addGlobalOptions } from "../../utils/options_util.js";
import { combineOptsWithSettings } from "../../utils/config_util.js";
import { authSpinnerWithConfigCheck, getIdToken } from "../../utils/auth_util.js";
import { BDSandbox } from "../../../integration/boilingdata/sandbox.js";
import { outputResults } from "../../utils/output_util.js";

const logger = getLogger("bdcli-sandbox-validate");

async function show(options: any, _command: cmd.Command): Promise<void> {
  try {
    options = await combineOptsWithSettings(options, logger);

    if (!authSpinnerWithConfigCheck()) return;
    const { idToken: token, cached: idCached } = await getIdToken(logger);
    updateSpinnerText(`Authenticating: ${idCached ? "cached" : "success"}`);
    spinnerSuccess();

    updateSpinnerText("Validating sandbox IaC template");
    const bdSandbox = new BDSandbox({ logger, authToken: token });
    await bdSandbox.validateTemplate(options.template, options.warningsAsErrors);
    spinnerSuccess();
  } catch (origErr: any) {
    // try to decode the message
    try {
      spinnerError(origErr?.message, false);
      await outputResults(
        JSON.parse(origErr?.message)
          ?.message?.split(";")
          ?.map((msg: string) => msg.trim()),
        false,
      );
    } catch (err: any) {
      if (err?.message.includes("Busy to")) return spinnerWarn("Deployment busy, try again");
      if (err?.message && !origErr?.message) spinnerError(err?.message, false);
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
