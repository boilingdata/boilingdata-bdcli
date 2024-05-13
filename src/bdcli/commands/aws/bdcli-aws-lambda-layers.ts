import * as cmd from "commander";
import * as sts from "@aws-sdk/client-sts";
import { ELogLevel, getLogger } from "../../utils/logger_util.js";
import { spinnerError, spinnerSuccess, spinnerWarn, updateSpinnerText } from "../../utils/spinner_util.js";
import { addGlobalOptions } from "../../utils/options_util.js";
import { getIdToken } from "../../utils/auth_util.js";
import { combineOptsWithSettings } from "../../utils/config_util.js";
import { BDAccount } from "../../../integration/boilingdata/account.js";
import { BoilingLambdaFunctions, ILambdaLayerOpts } from "../../../integration/bdLambdas.js";
import { LambdaClient } from "@aws-sdk/client-lambda";

const logger = getLogger("bdcli-aws-lambda-layers");
logger.setLogLevel(ELogLevel.WARN);

async function lambdalayers(options: any, _command: cmd.Command): Promise<void> {
  try {
    options = await combineOptsWithSettings(options, logger);

    if (!options.remove && !options.upgrade) {
      spinnerWarn("Please specify either --remove or --upgrade");
      return;
    }
    if (options.remove && (options.denyCwLogs || options.removeCwLogs)) {
      spinnerWarn("Can not use --deny-cw-logs or --remove-cw-logs when removing layer");
      return;
    }

    updateSpinnerText("Authenticating");
    const { idToken: token, cached, region } = await getIdToken(logger);
    updateSpinnerText(cached ? "Authenticating: cached" : "Authenticating: success");
    spinnerSuccess();

    updateSpinnerText(`NOT_IMPLEMENTED_YET: ${options.remove ? "Removing" : "Upgrading"} BoilingData AWS Lambda Layer`);
    if (!region) throw new Error("Pass --region parameter or set AWS_REGION env");
    const bdAccount = new BDAccount({ logger, authToken: token });
    const stsClient = new sts.STSClient({ region });
    const lambdaClient = new LambdaClient({ region });
    const bdLambdas = new BoilingLambdaFunctions({ logger, bdAccount, stsClient, lambdaClient });
    const opts: ILambdaLayerOpts = { prefix: options.functionPrefix };
    if (options.remove) await bdLambdas.removeLambdaLayers(opts);
    else if (options.upgrade) await bdLambdas.upgradeLambdaLayers(opts);
    spinnerSuccess();

    if (options.upgrade && options.denyCwLogs) {
      updateSpinnerText("NOT_IMPLEMENTED_YET: Denying AWS Lambda CW logging.");
      await bdLambdas.denyCWLogging(opts);
      spinnerSuccess();
    }
    if (options.upgrade && options.removeCwLogs) {
      updateSpinnerText("NOT_IMPLEMENTED_YET: Removing respective AWS Lambda CW log groups.");
      await bdLambdas.removeCWLogs(opts);
      spinnerSuccess();
    }
  } catch (err: any) {
    spinnerError(err?.message);
  }
}

const program = new cmd.Command("bdcli aws taps-iam")
  .addOption(new cmd.Option("-r, --region <region>", "AWS region"))
  .addOption(new cmd.Option("-p, --function-prefix <prefix>", "AWS Lambda function name prefix").makeOptionMandatory())
  .addOption(new cmd.Option("--upgrade", "Add/Upgrade the layer if not latest"))
  .addOption(new cmd.Option("--remove", "Remove the layer"))
  .addOption(new cmd.Option("--deny-cw-logs", "Update the AWS Lambda IAM Role default policy to deny CW Logs"))
  .addOption(new cmd.Option("--remove-cw-logs", "After succesull layer setup, remove AWS Lambda CW Logs"))
  .action(async (options, command) => await lambdalayers(options, command));

(async () => {
  await addGlobalOptions(program, logger);
  await program.parseAsync(process.argv);
})();
