import * as cmd from "commander";
import { getLogger } from "../../utils/logger_util.js";
import { spinnerError, spinnerInfo, spinnerSuccess, spinnerWarn, updateSpinnerText } from "../../utils/spinner_util.js";
import { addGlobalOptions } from "../../utils/options_util.js";
import { getIdToken, recoverPassword, updatePassword } from "../../utils/auth_util.js";

const logger = getLogger("bdcli-account-password");

async function show(options: any, _command: cmd.Command): Promise<void> {
  try {
    logger.debug({ options });

    if (!options.recover) {
      // by default we update the password
      try {
        updateSpinnerText("Authenticating");
        const { cached: idCached, region } = await getIdToken(logger);
        if (!region) throw new Error("Pass --region parameter or set AWS_REGION env");
        updateSpinnerText(`Authenticating: ${idCached ? "cached" : "success"}`);
        spinnerSuccess();

        updateSpinnerText("Updating password");
        await updatePassword(logger);
        spinnerWarn("Not yet implemented");
        spinnerSuccess();
        return;
      } catch (err: any) {
        logger.debug({ err });
        spinnerError(err?.message);
      }
    }

    if (options.recover) {
      try {
        updateSpinnerText("Password recovery");
        const resp = await recoverPassword(logger);
        spinnerInfo(resp);
        spinnerSuccess();
        return;
      } catch (err: any) {
        logger.debug({ err });
        spinnerError(err?.message);
      }
    }
  } catch (err: any) {
    spinnerError(err?.message);
  }
}

const program = new cmd.Command("bdcli account password")
  .addOption(new cmd.Option("--recover", "Start password recovery process instead"))
  .action(async (options, command) => await show(options, command));

(async () => {
  await addGlobalOptions(program, logger);
  await program.parseAsync(process.argv);
})();
