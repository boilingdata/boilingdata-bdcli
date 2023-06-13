import * as iam from "@aws-sdk/client-iam";
import * as sts from "@aws-sdk/client-sts";
import * as cmd from "commander";
import { getLogger } from "../../utils/logger_util.js";
import { spinnerError, spinnerSuccess, updateSpinnerText } from "../../utils/spinner_util.js";
import { addGlobalOptions } from "../../utils/options_util.js";
import { getIdToken } from "../../utils/auth_util.js";
import { BDIamRole } from "../../../core/aws/iam_roles.js";
import { BDAccount } from "../../../core/boilingdata/config.js";
import { BDDataSetConfig } from "../../../core/boilingdata/dataset.js";
import { BDIntegration } from "../../../core/bdIntegration.js";

const logger = getLogger("bdcli-setup-iam-role");

async function iamrole(options: any, _command: cmd.Command): Promise<void> {
  try {
    logger.debug({ options });

    updateSpinnerText("Authenticating");
    const token = await getIdToken();
    spinnerSuccess();

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
    updateSpinnerText("Creating IAM Role");
    const iamRoleArn = await bdRole.upsertRole(JSON.stringify(policyDocument));
    spinnerSuccess();

    updateSpinnerText("Registering IAM Role");
    await bdAccount.setIamRole(iamRoleArn);
    spinnerSuccess();
  } catch (err: any) {
    spinnerError(err?.message);
  }
}

const program = new cmd.Command("bdcli setup iam-role")
  .addOption(new cmd.Option("-c, --config <filepath>", "Data access conf").makeOptionMandatory())
  .addOption(new cmd.Option("-r, --region <region>", "AWS region"))
  .action(async (options, command) => await iamrole(options, command));

addGlobalOptions(program, logger);

(async () => await program.parseAsync(process.argv))();
