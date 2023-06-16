import * as iam from "@aws-sdk/client-iam";
import * as sts from "@aws-sdk/client-sts";
import * as cmd from "commander";
import { ELogLevel, getLogger } from "../../utils/logger_util.js";
import { spinnerError, spinnerSuccess, spinnerWarn, updateSpinnerText } from "../../utils/spinner_util.js";
import { addGlobalOptions } from "../../utils/options_util.js";
import { getIdToken } from "../../utils/auth_util.js";
import { BDIamRole } from "../../../integration/aws/iam_roles.js";
import { BDAccount } from "../../../integration/boilingdata/account.js";
import { BDDataSetConfig } from "../../../integration/boilingdata/dataset.js";
import { BDIntegration } from "../../../integration/bdIntegration.js";

const logger = getLogger("bdcli-setup-iam-role");
logger.setLogLevel(ELogLevel.WARN);

async function iamrole(options: any, _command: cmd.Command): Promise<void> {
  try {
    logger.debug({ options });

    if (options.delete) {
      updateSpinnerText("Not implemented yet. Please delete the IAM Role from AWS Console");
      spinnerWarn("Not implemented yet. Please delete the IAM Role from AWS Console");
      return;
    }

    updateSpinnerText("Authenticating");
    const token = await getIdToken();
    updateSpinnerText("Authenticating: success");
    spinnerSuccess();

    updateSpinnerText("Creating IAM Role");
    const region = options.region ?? process.env["AWS_REGION"];
    if (!region) throw new Error("Pass --region parameter or set AWS_REGION env");
    const bdAccount = new BDAccount({ logger, authToken: token });
    const bdDataSets = new BDDataSetConfig({ logger });
    const bdRole = new BDIamRole({
      ...options,
      logger,
      iamClient: new iam.IAMClient({ region }),
      stsClient: new sts.STSClient({ region }),
      datasets: await bdDataSets.readConfig(options.config),
      uniqNamePart: await bdDataSets.getUniqueNamePart(),
      assumeAwsAccount: await bdAccount.getAssumeAwsAccount(),
      assumeCondExternalId: await bdAccount.getExtId(),
    });
    const bdIntegration = new BDIntegration({ logger, bdAccount, bdRole, bdDataSets });
    const policyDocument = await bdIntegration.getPolicyDocument();
    const iamRoleArn = await bdRole.upsertRole(JSON.stringify(policyDocument));
    updateSpinnerText(`Creating IAM Role: ${iamRoleArn}`);
    spinnerSuccess();

    if (!options.createRoleOnly) {
      updateSpinnerText(`Registering IAM Role: ${iamRoleArn}`);
      await bdAccount.setIamRole(iamRoleArn);
      spinnerSuccess();
    }
  } catch (err: any) {
    spinnerError(err?.message);
  }
}

const program = new cmd.Command("bdcli setup iam-role")
  .addOption(new cmd.Option("-c, --config <filepath>", "Data access conf").makeOptionMandatory())
  .addOption(new cmd.Option("-r, --region <region>", "AWS region"))
  .addOption(new cmd.Option("--delete", "Delete the IAM role"))
  .addOption(new cmd.Option("--create-role-only", "Create the IAM role only and do not update BoilingData"))
  .action(async (options, command) => await iamrole(options, command));

addGlobalOptions(program, logger);

(async () => await program.parseAsync(process.argv))();
