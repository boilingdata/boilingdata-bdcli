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
const logger = getLogger("bdcli-domain");
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
        updateSpinnerText("Creating IAM Role");
        if (!region)
            throw new Error("Pass --region parameter or set AWS_REGION env");
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
            const datasourcesConfig = bdDataSources.getDatasourcesConfig();
            await bdAccount.setIamRoleWithPayload(iamRoleArn, { datasourcesConfig });
            spinnerSuccess();
        }
    }
    catch (err) {
        spinnerError(err?.message);
    }
}
const program = new cmd.Command("bdcli domain setup")
    .addOption(new cmd.Option("--domain <domain>", "Initiate your domain setup in BoilingData (to be implemented)").makeOptionMandatory())
    .action(async (options, command) => await iamrole(options, command));
(async () => {
    await addGlobalOptions(program, logger);
    await program.parseAsync(process.argv);
})();
