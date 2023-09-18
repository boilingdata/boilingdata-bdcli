import * as iam from "@aws-sdk/client-iam";
import * as sts from "@aws-sdk/client-sts";
import * as cmd from "commander";
import { ELogLevel, getLogger } from "../../utils/logger_util.js";
import { spinnerError, spinnerSuccess, spinnerWarn, updateSpinnerText } from "../../utils/spinner_util.js";
import { addGlobalOptions } from "../../utils/options_util.js";
import { getIdToken } from "../../utils/auth_util.js";
import { BDIamRole } from "../../../integration/aws/iam_roles.js";
import { BDAccount } from "../../../integration/boilingdata/account.js";
import { BDDataSourceConfig } from "../../../integration/boilingdata/dataset.js";
import { BDIntegration } from "../../../integration/bdIntegration.js";
import { combineOptsWithSettings } from "../../utils/config_util.js";

const logger = getLogger("bdcli-aws");
logger.setLogLevel(ELogLevel.WARN);

async function iamrole(options: any, _command: cmd.Command): Promise<void> {
  try {
    options = await combineOptsWithSettings(options, logger);

    if (options.delete) {
      updateSpinnerText("Not implemented yet. Please delete the IAM Role from AWS Console");
      spinnerWarn("Not implemented yet. Please delete the IAM Role from AWS Console");
      return;
    }

    updateSpinnerText("Authenticating");
    const { idToken: token, cached, region } = await getIdToken(logger);
    updateSpinnerText(cached ? "Authenticating: cached" : "Authenticating: success");
    spinnerSuccess();

    updateSpinnerText("Creating IAM Role");
    if (!region) throw new Error("Pass --region parameter or set AWS_REGION env");
    const bdAccount = new BDAccount({ logger, authToken: token });
    const bdDataSources = new BDDataSourceConfig({ logger });
    await bdDataSources.readConfig(options.config);
    const bdRole = new BDIamRole({
      ...options,
      logger,
      iamClient: new iam.IAMClient({ region }),
      stsClient: new sts.STSClient({ region }),
      uniqNamePart: await bdDataSources.getUniqueNamePart(),
      assumeAwsAccount: await bdAccount.getAssumeAwsAccount(),
      assumeCondExternalId: await bdAccount.getExtId(),
    });
    const bdIntegration = new BDIntegration({ logger, bdAccount, bdRole, bdDataSources });
    const policyDocument = await bdIntegration.getPolicyDocument();
    const iamRoleArn = await bdRole.upsertRole(JSON.stringify(policyDocument));
    updateSpinnerText(`Creating IAM Role: ${iamRoleArn}`);
    spinnerSuccess();

    if (!options.createRoleOnly) {
      updateSpinnerText(`Registering IAM Role: ${iamRoleArn}`);
      const datasourcesConfig = await bdDataSources.getDatasourcesConfig();
      await bdAccount.setIamRoleWithPayload(iamRoleArn, { datasourcesConfig });
      spinnerSuccess();
    }
  } catch (err: any) {
    spinnerError(err?.message);
  }
}

const program = new cmd.Command("bdcli setup iam-role")
  .addHelpText(
    "beforeAll",
    "If you have an AWS account, you can use this command to create BoilingData assumable AWS IAM Role into " +
      "your AWS account. It is fully owned and controlled by you. The IAM Policy is based on YAML configuration " +
      "file that you need to create. It describes S3 bucket(s) and prefixe(s) that you want to make available " +
      "through Boiling.\n\nSee the README.md in https://github.com/boilingdata/boilingdata-bdcli " +
      "for more information.\n",
  )
  .addOption(new cmd.Option("-c, --config <filepath>", "Data access conf").makeOptionMandatory())
  .addOption(new cmd.Option("-r, --region <region>", "AWS region"))
  .addOption(new cmd.Option("--delete", "Delete the IAM role"))
  .addOption(new cmd.Option("--create-role-only", "Create the IAM role only and do not update BoilingData"))
  .action(async (options, command) => await iamrole(options, command));

(async () => {
  await addGlobalOptions(program, logger);
  await program.parseAsync(process.argv);
})();
