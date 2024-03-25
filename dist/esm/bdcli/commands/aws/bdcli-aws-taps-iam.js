import * as iam from "@aws-sdk/client-iam";
import * as sts from "@aws-sdk/client-sts";
import * as cmd from "commander";
import { ELogLevel, getLogger } from "../../utils/logger_util.js";
import { spinnerError, spinnerSuccess, spinnerWarn, updateSpinnerText } from "../../utils/spinner_util.js";
import { addGlobalOptions } from "../../utils/options_util.js";
import { getIdToken } from "../../utils/auth_util.js";
import { BDIamRole, ERoleType } from "../../../integration/aws/iam_role.js";
import { BDAccount } from "../../../integration/boilingdata/account.js";
import { BDIntegration } from "../../../integration/bdIntegration.js";
import { combineOptsWithSettings } from "../../utils/config_util.js";
const logger = getLogger("bdcli-aws-taps-iam");
logger.setLogLevel(ELogLevel.WARN);
async function iamrole(options, _command) {
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
        updateSpinnerText("Creating TAPS IAM Role");
        if (!region)
            throw new Error("Pass --region parameter or set AWS_REGION env");
        const bdAccount = new BDAccount({ logger, authToken: token });
        const stsClient = new sts.STSClient({ region });
        const bdRole = new BDIamRole({
            ...options,
            logger,
            roleType: ERoleType.TAP,
            iamClient: new iam.IAMClient({ region }),
            stsClient,
            username: await bdAccount.getUsername(),
            assumeAwsAccount: await bdAccount.getAssumeAwsAccount(),
            assumeCondExternalId: await bdAccount.getExtId(),
        });
        const bdIntegration = new BDIntegration({ logger, bdAccount, bdRole, stsClient });
        const policyDocument = await bdIntegration.getTapsPolicyDocument();
        const iamRoleArn = await bdRole.upsertRole(JSON.stringify(policyDocument));
        updateSpinnerText(`Creating TAPS IAM Role: ${iamRoleArn}`);
        spinnerSuccess();
        if (!options.createRoleOnly) {
            updateSpinnerText(`Registering TAPS IAM Role: ${iamRoleArn}`);
            await bdAccount.setTapsIamRoleWithPayload(iamRoleArn);
            spinnerSuccess();
        }
    }
    catch (err) {
        spinnerError(err?.message);
    }
}
const program = new cmd.Command("bdcli aws taps-iam")
    .addHelpText("beforeAll", "If you have an AWS account, you can use this command to create BoilingData assumable AWS IAM Role into " +
    "your AWS account. It is fully owned and controlled by you. The IAM Policy allows deploying Data Taps " +
    "(Lambda Functions with URL) into your account and creating the needed IAM Role for the Data Tap itself" +
    " (service role). \n\nSee the README.md in https://github.com/boilingdata/boilingdata-bdcli " +
    "for more information.\n")
    .addOption(new cmd.Option("-r, --region <region>", "AWS region"))
    .addOption(new cmd.Option("--delete", "Delete the IAM role"))
    .addOption(new cmd.Option("--create-role-only", "Create the IAM role only and do not update BoilingData"))
    .action(async (options, command) => await iamrole(options, command));
(async () => {
    await addGlobalOptions(program, logger);
    await program.parseAsync(process.argv);
})();
