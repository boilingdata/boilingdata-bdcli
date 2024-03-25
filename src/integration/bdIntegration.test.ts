import { getIdToken } from "../bdcli/utils/auth_util.js";
import { ELogLevel, getLogger } from "../bdcli/utils/logger_util.js";
import { BDIamRole, ERoleType } from "./aws/iam_role.js";
import { BDIntegration } from "./bdIntegration.js";
import { BDAccount } from "./boilingdata/account.js";
import { BDDataSourceConfig } from "./boilingdata/dataset.js";
import { IAMClient } from "@aws-sdk/client-iam";
import { GetCallerIdentityCommand, STSClient } from "@aws-sdk/client-sts";
import { mockClient } from "aws-sdk-client-mock";

const iamMock = mockClient(IAMClient);
const stsMock = mockClient(STSClient);
iamMock.resolves({});

const accountLogger = getLogger("bd-account");
const dssLogger = getLogger("bd-datasets");
const roleLogger = getLogger("bd-role");
const accessLogger = getLogger("bd-access");
accountLogger.setLogLevel(ELogLevel.DEBUG);
// dssLogger.setLogLevel(ELogLevel.DEBUG);
// roleLogger.setLogLevel(ELogLevel.DEBUG);
accessLogger.setLogLevel(ELogLevel.DEBUG);

const region = "eu-west-1";
const iamClient = new IAMClient({ region });
const stsClient = new STSClient({ region });
const bdDataSets = new BDDataSourceConfig({ logger: dssLogger });
let bdAccount: BDAccount;

describe("BDIntegration", () => {
  beforeAll(async () => {
    const authToken = await getIdToken();
    bdAccount = new BDAccount({ logger: accountLogger, authToken: authToken.idToken });
  });

  it.skip("getGroupedBuckets", async () => {
    bdDataSets.readConfig("./example_datasource_config.yaml");
    const assumeCondExternalId = await bdAccount.getExtId(); // FIXME: This calls real API
    const assumeAwsAccount = await bdAccount.getAssumeAwsAccount();
    const username = await bdAccount.getUsername();
    const bdRole = new BDIamRole({
      logger: roleLogger,
      region,
      roleType: ERoleType.S3,
      iamClient,
      stsClient,
      username,
      assumeAwsAccount,
      assumeCondExternalId,
    });
    const bdIntegration = new BDIntegration({
      logger: accessLogger,
      bdAccount,
      bdDataSources: bdDataSets,
      bdRole,
      stsClient,
    });
    stsMock.on(GetCallerIdentityCommand).resolves({ Account: "123123123123" });
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
    const username = await bdAccount.getUsername();
    const bdRole = new BDIamRole({
      logger: roleLogger,
      region,
      roleType: ERoleType.S3,
      iamClient,
      stsClient,
      username,
      assumeAwsAccount,
      assumeCondExternalId,
    });
    const bdIntegration = new BDIntegration({
      logger: accessLogger,
      bdAccount,
      bdDataSources: bdDataSets,
      bdRole,
      stsClient,
    });
    stsMock.on(GetCallerIdentityCommand).resolves({ Account: "123123123123" });
    const res = await bdIntegration.getS3PolicyDocument();
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
