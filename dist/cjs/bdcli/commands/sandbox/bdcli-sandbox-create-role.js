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
const config_util_js_1 = require("../../utils/config_util.js");
const auth_util_js_1 = require("../../utils/auth_util.js");
const sandbox_js_1 = require("../../../integration/boilingdata/sandbox.js");
const iam_roles_js_1 = require("../../../integration/aws/iam_roles.js");
const account_js_1 = require("../../../integration/boilingdata/account.js");
const bdIntegration_js_1 = require("../../../integration/bdIntegration.js");
const dataset_js_1 = require("../../../integration/boilingdata/dataset.js");
const logger = (0, logger_util_js_1.getLogger)("bdcli-sandbox-create-role");
async function show(options, _command) {
    try {
        options = await (0, config_util_js_1.combineOptsWithSettings)(options, logger);
        if (!(await (0, config_util_js_1.hasValidConfig)())) {
            return (0, spinner_util_js_1.spinnerError)(`No valid bdcli configuration found for "${config_util_js_1.profile}" profile`);
        }
        if (options.delete) {
            (0, spinner_util_js_1.updateSpinnerText)("Not implemented yet. Please delete the IAM Role from AWS Console");
            (0, spinner_util_js_1.spinnerWarn)("Not implemented yet. Please delete the IAM Role from AWS Console");
            return;
        }
        (0, spinner_util_js_1.updateSpinnerText)("Authenticating");
        const { idToken: token, cached: idCached } = await (0, auth_util_js_1.getIdToken)(logger);
        (0, spinner_util_js_1.updateSpinnerText)(`Authenticating: ${idCached ? "cached" : "success"}`);
        (0, spinner_util_js_1.spinnerSuccess)();
        (0, spinner_util_js_1.updateSpinnerText)("Creating sandbox IAM Role into *your* AWS Account");
        const bdSandbox = new sandbox_js_1.BDSandbox({ logger, authToken: token }).withTemplate(options.template);
        const region = bdSandbox.region;
        const bdAccount = new account_js_1.BDAccount({ logger, authToken: token });
        const bdDataSources = new dataset_js_1.BDDataSourceConfig({ logger });
        bdDataSources.withConfig({ dataSources: bdSandbox.tmpl.resources.storage });
        const bdRole = new iam_roles_js_1.BDIamRole({
            ...options,
            logger,
            iamClient: new iam.IAMClient({ region }),
            stsClient: new sts.STSClient({ region }),
            environment: bdSandbox.tmpl.environment,
            templateName: bdSandbox.tmpl.id,
            username: await bdAccount.getUsername(),
            assumeAwsAccount: await bdAccount.getAssumeAwsAccount(),
            assumeCondExternalId: await bdAccount.getExtId(),
        });
        const bdIntegration = new bdIntegration_js_1.BDIntegration({ logger, bdAccount, bdRole, bdDataSources });
        const policyDocument = await bdIntegration.getPolicyDocument(options.listBucketsPermission);
        let iamRoleArn;
        if (!options.dryRun)
            iamRoleArn = await bdRole.upsertRole(JSON.stringify(policyDocument));
        (0, spinner_util_js_1.updateSpinnerText)(`Creating IAM Role: ${iamRoleArn}` + (options.dryRun ? "(dry-run)" : ""));
        (0, spinner_util_js_1.spinnerSuccess)();
    }
    catch (err) {
        // try to decode the message
        (0, spinner_util_js_1.spinnerError)(err?.message, false);
    }
}
const program = new cmd.Command("bdcli sandbox create-role")
    .addOption(new cmd.Option("--template <templateFile>", "sandbox IaC file").makeOptionMandatory())
    .addOption(new cmd.Option("--delete", "Delete the sandbox IAM role from *your* AWS Account"))
    .addOption(new cmd.Option("--no-list-buckets-permission", "Do NOT add s3:ListAllMyBuckets policy entry"))
    .addOption(new cmd.Option("--dry-run", "Dry run, do not actually create the IAM role"))
    .action(async (options, command) => await show(options, command));
(async () => {
    await (0, options_util_js_1.addGlobalOptions)(program, logger);
    await program.parseAsync(process.argv);
})();
