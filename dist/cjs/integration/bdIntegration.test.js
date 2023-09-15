"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const auth_util_js_1 = require("../bdcli/utils/auth_util.js");
const logger_util_js_1 = require("../bdcli/utils/logger_util.js");
const iam_roles_js_1 = require("./aws/iam_roles.js");
const bdIntegration_js_1 = require("./bdIntegration.js");
const account_js_1 = require("./boilingdata/account.js");
const dataset_js_1 = require("./boilingdata/dataset.js");
const client_iam_1 = require("@aws-sdk/client-iam");
const client_sts_1 = require("@aws-sdk/client-sts");
const aws_sdk_client_mock_1 = require("aws-sdk-client-mock");
const iamMock = (0, aws_sdk_client_mock_1.mockClient)(client_iam_1.IAMClient);
const stsMock = (0, aws_sdk_client_mock_1.mockClient)(client_sts_1.STSClient);
iamMock.resolves({});
const accountLogger = (0, logger_util_js_1.getLogger)("bd-account");
const dssLogger = (0, logger_util_js_1.getLogger)("bd-datasets");
const roleLogger = (0, logger_util_js_1.getLogger)("bd-role");
const accessLogger = (0, logger_util_js_1.getLogger)("bd-access");
accountLogger.setLogLevel(logger_util_js_1.ELogLevel.DEBUG);
// dssLogger.setLogLevel(ELogLevel.DEBUG);
// roleLogger.setLogLevel(ELogLevel.DEBUG);
accessLogger.setLogLevel(logger_util_js_1.ELogLevel.DEBUG);
const region = "eu-west-1";
const iamClient = new client_iam_1.IAMClient({ region });
const stsClient = new client_sts_1.STSClient({ region });
const bdDataSets = new dataset_js_1.BDDataSourceConfig({ logger: dssLogger });
let bdAccount;
describe("BDIntegration", () => {
    beforeAll(async () => {
        const authToken = await (0, auth_util_js_1.getIdToken)();
        bdAccount = new account_js_1.BDAccount({ logger: accountLogger, authToken: authToken.idToken });
    });
    it.skip("getGroupedBuckets", async () => {
        bdDataSets.readConfig("./example_datasource_config.yaml");
        const assumeCondExternalId = await bdAccount.getExtId(); // FIXME: This calls real API
        const assumeAwsAccount = await bdAccount.getAssumeAwsAccount();
        const uniqNamePart = await bdDataSets.getUniqueNamePart();
        const bdRole = new iam_roles_js_1.BDIamRole({
            logger: roleLogger,
            region,
            iamClient,
            stsClient,
            uniqNamePart,
            assumeAwsAccount,
            assumeCondExternalId,
        });
        const bdIntegration = new bdIntegration_js_1.BDIntegration({ logger: accessLogger, bdAccount, bdDataSources: bdDataSets, bdRole });
        stsMock.on(client_sts_1.GetCallerIdentityCommand).resolves({ Account: "123123123123" });
        expect(bdIntegration.getGroupedBuckets()).toMatchInlineSnapshot(`
      {
        "readOnly": [
          {
            "bucket": "boilingdata-demo",
            "id": "bd-demo-policy",
            "permissions": [
              "read",
            ],
            "prefix": "demo",
            "urlPrefix": "s3://boilingdata-demo/demo",
          },
        ],
        "readWrite": [
          {
            "bucket": "isecurefi-dev-test",
            "id": "nyc-policy",
            "permissions": [
              "read",
              "write",
            ],
            "prefix": "nyc-tlc/",
            "urlPrefix": "s3://isecurefi-dev-test/nyc-tlc/",
          },
        ],
        "writeOnly": [],
      }
    `);
    });
    it.skip("PolicyDocument", async () => {
        bdDataSets.readConfig("./example_datasource_config.yaml");
        const assumeCondExternalId = await bdAccount.getExtId(); // FIXME: This calls real API
        const assumeAwsAccount = await bdAccount.getAssumeAwsAccount();
        const uniqNamePart = await bdDataSets.getUniqueNamePart();
        const bdRole = new iam_roles_js_1.BDIamRole({
            logger: roleLogger,
            region,
            iamClient,
            stsClient,
            uniqNamePart,
            assumeAwsAccount,
            assumeCondExternalId,
        });
        const bdIntegration = new bdIntegration_js_1.BDIntegration({ logger: accessLogger, bdAccount, bdDataSources: bdDataSets, bdRole });
        stsMock.on(client_sts_1.GetCallerIdentityCommand).resolves({ Account: "123123123123" });
        const res = await bdIntegration.getPolicyDocument();
        expect(res).toMatchInlineSnapshot(`
      {
        "Statement": [
          {
            "Action": [
              "s3:GetObject",
            ],
            "Effect": "Allow",
            "Resource": [
              "arn:aws:s3:::boilingdata-demo/demo*",
            ],
          },
          {
            "Action": [
              "s3:PutObject",
              "s3:GetObject",
            ],
            "Effect": "Allow",
            "Resource": [
              "arn:aws:s3:::isecurefi-dev-test/nyc-tlc/*",
            ],
          },
          {
            "Action": [
              "s3:ListBucket",
              "s3:GetBucketLocation",
              "s3:GetBucketRequestPayment",
            ],
            "Effect": "Allow",
            "Resource": [
              "arn:aws:s3:::boilingdata-demo",
              "arn:aws:s3:::isecurefi-dev-test",
            ],
          },
          {
            "Action": "s3:ListAllMyBuckets",
            "Effect": "Allow",
            "Resource": "*",
          },
        ],
        "Version": "2012-10-17",
      }
    `);
    });
});
