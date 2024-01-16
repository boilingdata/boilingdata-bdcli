import * as cmd from "commander";
import { getLogger } from "../../utils/logger_util.js";
import { spinnerError, spinnerSuccess, updateSpinnerText } from "../../utils/spinner_util.js";
import { addGlobalOptions } from "../../utils/options_util.js";
import { combineOptsWithSettings, hasValidConfig, profile } from "../../utils/config_util.js";
import { BDSandbox } from "../../../integration/boilingdata/sandbox.js";
import { getIdToken } from "../../utils/auth_util.js";
import { outputResults } from "../../utils/output_util.js";

const logger = getLogger("bdcli-sandbox-plan");

async function show(options: any, _command: cmd.Command): Promise<void> {
  try {
    options = await combineOptsWithSettings(options, logger);

    if (!(await hasValidConfig())) {
      return spinnerError(`No valid bdcli configuration found for "${profile}" profile`);
    }

    updateSpinnerText("Authenticating");
    const { idToken: token, cached: idCached, region: region } = await getIdToken(logger);
    updateSpinnerText(`Authenticating: ${idCached ? "cached" : "success"}`);
    spinnerSuccess();

    updateSpinnerText(`Planning deployment for sandbox ${options.name}`);
    if (!region) throw new Error("Pass --region parameter or set AWS_REGION env");
    const bdSandbox = new BDSandbox({ logger, authToken: token });
    const results = await bdSandbox.planSandbox(options.name);
    spinnerSuccess();
    await outputResults(results?.planResults, options.disableSpinner);
  } catch (err: any) {
    spinnerError(err?.message);
  }
}

// TODO:
//  - If the template is updated, like changing the name of a resource, it needs to be replaced?
//    Like if the Tap name is changed the Lambda needs to be deleted and created again and then
//    also the ingest URL changes.

const program = new cmd.Command("bdcli sandbox plan")
  .addOption(new cmd.Option("--name <sandboxName>", "sandbox name").makeOptionMandatory())
  .addOption(new cmd.Option("--region <region>", "AWS region (by default eu-west-1").default("eu-west-1"))
  .action(async (options, command) => await show(options, command));

(async () => {
  await addGlobalOptions(program, logger);
  await program.parseAsync(process.argv);
})();