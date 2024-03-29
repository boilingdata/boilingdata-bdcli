import * as iam from "@aws-sdk/client-iam";
import * as sts from "@aws-sdk/client-sts";
import * as cmd from "commander";
import { ELogLevel, getLogger } from "../../utils/logger_util.js";
import { spinnerError, spinnerSuccess, spinnerWarn, updateSpinnerText } from "../../utils/spinner_util.js";
import { addGlobalOptions } from "../../utils/options_util.js";
import { authSpinnerWithConfigCheck, getIdToken } from "../../utils/auth_util.js";
import { BDIamRole } from "../../../integration/aws/iam_role.js";
import { BDAccount } from "../../../integration/boilingdata/account.js";
import { BDDataSourceConfig } from "../../../integration/boilingdata/dataset.js";
import { BDIntegration } from "../../../integration/bdIntegration.js";
import { combineOptsWithSettings } from "../../utils/config_util.js";

const logger = getLogger("bdcli-domain");
logger.setLogLevel(ELogLevel.WARN);

async function iamrole(options: any, _command: cmd.Command): Promise<void> {
  try {
    options = await combineOptsWithSettings(options, logger);

    if (options.delete) {
      updateSpinnerText("Not implemented yet. Please delete the IAM Role from AWS Console");
      spinnerWarn("Not implemented yet. Please delete the IAM Role from AWS Console");
      return;
    }

    if (!authSpinnerWithConfigCheck()) return;
    const { idToken: token, cached, region } = await getIdToken(logger);
    updateSpinnerText(cached ? "Authenticating: cached" : "Authenticating: success");
    spinnerSuccess();

    updateSpinnerText("Creating IAM Role");
    if (!region) throw new Error("Pass --region parameter or set AWS_REGION env");
    const bdAccount = new BDAccount({ logger, authToken: token });
    const bdDataSources = new BDDataSourceConfig({ logger });
    await bdDataSources.readConfig(options.config);
    const stsClient = new sts.STSClient({ region });
    const bdRole = new BDIamRole({
      ...options,
      logger,
      iamClient: new iam.IAMClient({ region }),
      stsClient: new sts.STSClient({ region }),
      assumeAwsAccount: await bdAccount.getAssumeAwsAccount(),
      assumeCondExternalId: await bdAccount.getExtId(),
    });
    const bdIntegration = new BDIntegration({ logger, bdAccount, bdRole, bdDataSources, stsClient });
    const policyDocument = await bdIntegration.getS3PolicyDocument();
    const iamRoleArn = await bdRole.upsertRole(JSON.stringify(policyDocument));
    updateSpinnerText(`Creating IAM Role: ${iamRoleArn}`);
    spinnerSuccess();

    if (!options.createRoleOnly) {
      updateSpinnerText(`Registering IAM Role: ${iamRoleArn}`);
      const datasourcesConfig = bdDataSources.getDatasourcesConfig();
      await bdAccount.setS3IamRoleWithPayload(iamRoleArn, { datasourcesConfig });
      spinnerSuccess();
    }
  } catch (err: any) {
    spinnerError(err?.message);
  }
}

const program = new cmd.Command("bdcli domain setup")
  .addOption(
    new cmd.Option(
      "--domain <domain>",
      "Initiate your domain setup in BoilingData (to be implemented)",
    ).makeOptionMandatory(),
  )
  .action(async (options, command) => await iamrole(options, command));

(async () => {
  await addGlobalOptions(program, logger);
  await program.parseAsync(process.argv);
})();
