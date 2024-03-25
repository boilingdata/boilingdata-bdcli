"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const iam = __importStar(require("@aws-sdk/client-iam"));
const sts = __importStar(require("@aws-sdk/client-sts"));
const cmd = __importStar(require("commander"));
const logger_util_js_1 = require("../../utils/logger_util.js");
const spinner_util_js_1 = require("../../utils/spinner_util.js");
const options_util_js_1 = require("../../utils/options_util.js");
const auth_util_js_1 = require("../../utils/auth_util.js");
const iam_role_js_1 = require("../../../integration/aws/iam_role.js");
const account_js_1 = require("../../../integration/boilingdata/account.js");
const dataset_js_1 = require("../../../integration/boilingdata/dataset.js");
const bdIntegration_js_1 = require("../../../integration/bdIntegration.js");
const config_util_js_1 = require("../../utils/config_util.js");
const logger = (0, logger_util_js_1.getLogger)("bdcli-aws-iam");
logger.setLogLevel(logger_util_js_1.ELogLevel.WARN);
async function iamrole(options, _command) {
    try {
        options = await (0, config_util_js_1.combineOptsWithSettings)(options, logger);
        if (options.delete) {
            (0, spinner_util_js_1.updateSpinnerText)("Not implemented yet. Please delete the IAM Role from AWS Console");
            (0, spinner_util_js_1.spinnerWarn)("Not implemented yet. Please delete the IAM Role from AWS Console");
            return;
        }
        (0, spinner_util_js_1.updateSpinnerText)("Authenticating");
        const { idToken: token, cached, region } = await (0, auth_util_js_1.getIdToken)(logger);
        (0, spinner_util_js_1.updateSpinnerText)(cached ? "Authenticating: cached" : "Authenticating: success");
        (0, spinner_util_js_1.spinnerSuccess)();
        (0, spinner_util_js_1.updateSpinnerText)("Creating S3 IAM Role");
        if (!region)
            throw new Error("Pass --region parameter or set AWS_REGION env");
        const bdAccount = new account_js_1.BDAccount({ logger, authToken: token });
        const bdDataSources = new dataset_js_1.BDDataSourceConfig({ logger });
        await bdDataSources.readConfig(options.config);
        const stsClient = new sts.STSClient({ region });
        const bdRole = new iam_role_js_1.BDIamRole({
            ...options,
            logger,
            roleType: iam_role_js_1.ERoleType.S3,
            iamClient: new iam.IAMClient({ region }),
            stsClient,
            username: await bdAccount.getUsername(),
            assumeAwsAccount: await bdAccount.getAssumeAwsAccount(),
            assumeCondExternalId: await bdAccount.getExtId(),
        });
        const bdIntegration = new bdIntegration_js_1.BDIntegration({ logger, bdAccount, bdRole, bdDataSources, stsClient });
        const policyDocument = await bdIntegration.getS3PolicyDocument();
        const iamRoleArn = await bdRole.upsertRole(JSON.stringify(policyDocument));
        (0, spinner_util_js_1.updateSpinnerText)(`Creating S3 IAM Role: ${iamRoleArn}`);
        (0, spinner_util_js_1.spinnerSuccess)();
        if (!options.createRoleOnly) {
            (0, spinner_util_js_1.updateSpinnerText)(`Registering S3 IAM Role: ${iamRoleArn}`);
            const datasourcesConfig = bdDataSources.getDatasourcesConfig();
            await bdAccount.setS3IamRoleWithPayload(iamRoleArn, { datasourcesConfig });
            (0, spinner_util_js_1.spinnerSuccess)();
        }
    }
    catch (err) {
        (0, spinner_util_js_1.spinnerError)(err?.message);
    }
}
const program = new cmd.Command("bdcli aws iam")
    .addHelpText("beforeAll", "If you have an AWS account, you can use this command to create BoilingData assumable AWS IAM Role into " +
    "your AWS account. It is fully owned and controlled by you. The IAM Policy is based on YAML configuration " +
    "file that you need to create. It describes S3 bucket(s) and prefixe(s) that you want to make available " +
    "through Boiling.\n\nSee the README.md in https://github.com/boilingdata/boilingdata-bdcli " +
    "for more information.\n")
    .addOption(new cmd.Option("-c, --config <filepath>", "Data access conf").makeOptionMandatory())
    .addOption(new cmd.Option("-r, --region <region>", "AWS region"))
    .addOption(new cmd.Option("--delete", "Delete the IAM role"))
    .addOption(new cmd.Option("--create-role-only", "Create the IAM role only and do not update BoilingData"))
    .action(async (options, command) => await iamrole(options, command));
(async () => {
    await (0, options_util_js_1.addGlobalOptions)(program, logger);
    await program.parseAsync(process.argv);
})();
