import { ELogLevel, getLogger } from "../bdcli/utils/logger_util.js";
import { BDIamRole } from "./aws/iam_roles.js";
import { BDIntegration } from "./bdIntegration.js";
import { BDAccount } from "./boilingdata/config.js";
import { BDDataSetConfig } from "./boilingdata/dataset.js";
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
// accountLogger.setLogLevel(ELogLevel.DEBUG);
// dssLogger.setLogLevel(ELogLevel.DEBUG);
// roleLogger.setLogLevel(ELogLevel.DEBUG);
accessLogger.setLogLevel(ELogLevel.DEBUG);

const region = "eu-west-1";
const iamClient = new IAMClient({ region });
const stsClient = new STSClient({ region });
const bdAccount = new BDAccount({ logger: accountLogger, authToken: "dummy" });
const bdDataSets = new BDDataSetConfig({ logger: dssLogger });

describe("BDIntegration", () => {
  it("BDIntegration", async () => {
    bdDataSets.readConfig("./example_dataset_config.yaml");
    const assumeCondExternalId = await bdAccount.getExtId();
    const assumeAwsAccount = await bdAccount.getAssumeAwsAccount();
    const uniqNamePart = await bdDataSets.getUniqueNamePart();
    const bdRole = new BDIamRole({
      logger: roleLogger,
      region,
      iamClient,
      stsClient,
      uniqNamePart,
      assumeAwsAccount,
      assumeCondExternalId,
    });
    const bdIntegration = new BDIntegration({ logger: accessLogger, bdAccount, bdDataSets, bdRole });
    stsMock.on(GetCallerIdentityCommand).resolves({ Account: "123123123123" });
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
              "arn:aws:s3:::boilingdata-demo",
            ],
          },
          {
            "Action": [
              "s3:PutObject",
              "s3:GetObject",
            ],
            "Effect": "Allow",
            "Resource": [
              "arn:aws:s3:::isecurefi-dev-test",
              "arn:aws:s3:::isecurefi-dev-test/nyc-tlc/trip_data/*",
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
