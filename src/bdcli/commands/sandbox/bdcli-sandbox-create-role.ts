import * as iam from "@aws-sdk/client-iam";
import * as sts from "@aws-sdk/client-sts";
import * as cmd from "commander";
import { getLogger } from "../../utils/logger_util.js";
import { spinnerError, spinnerSuccess, spinnerWarn, updateSpinnerText } from "../../utils/spinner_util.js";
import { addGlobalOptions } from "../../utils/options_util.js";
import { combineOptsWithSettings } from "../../utils/config_util.js";
import { authSpinnerWithConfigCheck, getIdToken } from "../../utils/auth_util.js";
import { BDSandbox } from "../../../integration/boilingdata/sandbox.js";
import { BDIamRole } from "../../../integration/aws/iam_role.js";
import { BDAccount } from "../../../integration/boilingdata/account.js";
import { BDIntegration } from "../../../integration/bdIntegration.js";
import { BDDataSourceConfig } from "../../../integration/boilingdata/dataset.js";

const logger = getLogger("bdcli-sandbox-create-role");

async function show(options: any, _command: cmd.Command): Promise<void> {
  try {
    options = await combineOptsWithSettings(options, logger);

    if (options.delete) {
      updateSpinnerText("Not implemented yet. Please delete the IAM Role from AWS Console");
      spinnerWarn("Not implemented yet. Please delete the IAM Role from AWS Console");
      return;
    }

    if (!authSpinnerWithConfigCheck()) return;
    const { idToken: token, cached: idCached } = await getIdToken(logger);
    updateSpinnerText(`Authenticating: ${idCached ? "cached" : "success"}`);
    spinnerSuccess();

    updateSpinnerText("Creating sandbox IAM Role into *your* AWS Account");
    const bdSandbox = new BDSandbox({ logger, authToken: token }).withTemplate(options.template);
    const region = bdSandbox.region;
    const bdAccount = new BDAccount({ logger, authToken: token });
    const bdDataSources = new BDDataSourceConfig({ logger });
    bdDataSources.withConfig({ dataSource: bdSandbox.tmpl.resources.storage });
    const stsClient = new sts.STSClient({ region });
    const bdRole = new BDIamRole({
      ...options,
      logger,
      iamClient: new iam.IAMClient({ region }),
      stsClient,
      templateName: bdSandbox.tmpl.id,
      username: await bdAccount.getUsername(),
      assumeAwsAccount: await bdAccount.getAssumeAwsAccount(),
      assumeCondExternalId: await bdAccount.getExtId(),
    });
    const bdIntegration = new BDIntegration({ logger, bdAccount, bdRole, bdDataSources, stsClient });
    const policyDocument = await bdIntegration.getS3PolicyDocument(options.listBucketsPermission);
    if (options.dryRun) {
      updateSpinnerText(`Creating IAM Role (dry-run)`);
      spinnerSuccess();
      return;
    }
    const iamRoleArn = await bdRole.upsertRole(JSON.stringify(policyDocument));
    spinnerSuccess();

    updateSpinnerText(`Registering S3 IAM Role: ${iamRoleArn}`);
    const datasourcesConfig = bdDataSources.getDatasourcesConfig();
    await bdAccount.setS3IamRoleWithPayload(iamRoleArn, { datasourcesConfig });
    spinnerSuccess();
  } catch (err: any) {
    // try to decode the message
    spinnerError(err?.message, false);
  }
}

const program = new cmd.Command("bdcli sandbox create-role")
  .addOption(new cmd.Option("--template <templateFile>", "sandbox IaC file").makeOptionMandatory())
  .addOption(new cmd.Option("--delete", "Delete the sandbox IAM role from *your* AWS Account"))
  .addOption(new cmd.Option("--no-list-buckets-permission", "Do NOT add s3:ListAllMyBuckets policy entry"))
  .addOption(new cmd.Option("--dry-run", "Dry run, do not actually create the IAM role"))
  .action(async (options, command) => await show(options, command));

(async () => {
  await addGlobalOptions(program, logger);
  await program.parseAsync(process.argv);
})();
