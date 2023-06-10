import { ELogLevel, getLogger } from "../bdcli/utils/logger_util.js";
import { BDIamRole } from "./aws/iam_roles.js";
import { BDAccess } from "./bdAccess.js";
import { BDAccount } from "./boilingdata/config.js";
import { BDDataSetConfig } from "./boilingdata/dataset.js";
import { IAMClient } from "@aws-sdk/client-iam";
import { mockClient } from "aws-sdk-client-mock";

const iamMock = mockClient(IAMClient);
iamMock.resolves({});

const accountLogger = getLogger("bd-account");
const dssLogger = getLogger("bd-datasets");
const roleLogger = getLogger("bd-role");
const accessLogger = getLogger("bd-access");
// accountLogger.setLogLevel(ELogLevel.DEBUG);
// dssLogger.setLogLevel(ELogLevel.DEBUG);
// roleLogger.setLogLevel(ELogLevel.DEBUG);
// accessLogger.setLogLevel(ELogLevel.DEBUG);

const region = "eu-west-1";
const iamClient = new IAMClient({ region });
const bdAccount = new BDAccount({ logger: accountLogger, authToken: "dummy" });
const bdDataSets = new BDDataSetConfig({ logger: dssLogger });

describe("BDAccess", () => {
  it("BDAccess", async () => {
    const assumeCondExternalId = await bdAccount.getExtId();
    const assumeAwsAccount = await bdAccount.getAssumeAwsAccount();
    const uniqNamePart = await bdDataSets.getUniqueNamePart();
    const bdRole = new BDIamRole({
      logger: roleLogger,
      region,
      iamClient,
      uniqNamePart,
      assumeAwsAccount,
      assumeCondExternalId,
    });
    const bdAccess = new BDAccess({ logger: accessLogger, bdAccount, bdDataSets, bdRole });
    const res = await bdAccess.check();
    expect(res).toEqual({});
  });
});
