import { ELogLevel, getLogger } from "../../bdcli/utils/logger_util.js";
import { IBDIamRole, BDIamRole } from "./iam_roles.js";
import { CreatePolicyCommand, CreateRoleCommand, GetRoleCommand, IAMClient } from "@aws-sdk/client-iam";
import { mockClient } from "aws-sdk-client-mock";

const iamMock = mockClient(IAMClient);

const logger = getLogger("iam-role-tests");
logger.setLogLevel(ELogLevel.DEBUG);

const region = "us-east-1";
const roleParams: IBDIamRole = {
  logger,
  iamClient: new IAMClient({ region }),
  region,
  uniqNamePart: "boilingdata-demo-isecurefi-dev-and-all-the-rest-of-the-buckets",
  assumeAwsAccount: "123123123123",
  assumeCondExternalId: "abcdef123123",
};

const dummyRole = {
  Path: "dummy",
  RoleName: "dummy",
  RoleId: "dummy",
  Arn: "dummy",
  CreateDate: undefined,
};

describe("iamRole", () => {
  beforeEach(() => {
    iamMock.reset();
  });

  it("getIamRoleName", async () => {
    const role = new BDIamRole(roleParams);
    expect(role.iamRoleName).toEqual("bd-ue1-boilingdata-demo-isecurefi-dev-and-all-th-218be713a48db5a");
  });

  it("getIamRoleName with own prefix", async () => {
    const role = new BDIamRole({ ...roleParams, roleNamePrefix: "myPrefix" });
    expect(role.iamRoleName).toEqual("myPrefix-ue1-boilingdata-demo-isecurefi-dev-and--c68f31eec7fe616");
  });

  it("getIamRoleName with own path and prefix", async () => {
    const role = new BDIamRole({ ...roleParams, roleNamePrefix: "myPrefix", path: "bd-service/demo/" });
    expect(role.iamRoleName).toEqual("myPrefix-ue1-boilingdata-demo-isecurefi-dev-and--f3c25e2288110d4");
  });

  it("getRole", async () => {
    iamMock.on(GetRoleCommand).resolves({ Role: dummyRole });
    const role = new BDIamRole(roleParams);
    expect(await role.getRole()).toEqual(dummyRole);
  });

  it("createRole - already exists", async () => {
    iamMock.on(GetRoleCommand).resolves({ Role: dummyRole });
    iamMock.on(CreateRoleCommand).resolves({ Role: dummyRole });
    const role = new BDIamRole(roleParams);
    expect(await role.createRoleIfNotExists()).toEqual(dummyRole);
  });

  it("createRole - does not yet exist", async () => {
    iamMock.on(CreatePolicyCommand).resolves({ Policy: {} });
    iamMock.on(CreateRoleCommand).resolves({ Role: dummyRole });
    const role = new BDIamRole(roleParams);
    expect(await role.createRoleIfNotExists()).toEqual(dummyRole);
  });
});

describe("policies", () => {
  it("getAssumeRolePolicyDocument", () => {
    const role = new BDIamRole(roleParams);
    expect(role.getAssumeRolePolicyDocument()).toEqual({
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Principal: { AWS: "123123123123" },
          Action: "sts:AssumeRole",
          Condition: { StringEquals: { "sts:ExternalId": "abcdef123123" } },
        },
      ],
    });
  });

  it.only("getRolePermissionsPolicy", () => {
    const role = new BDIamRole(roleParams);
    expect(role.managedBdAccessRolePolicyInput({})).toEqual({
      Description: "Access Role for BoilingData",
      PolicyDocument: "{}",
      PolicyName: "bd-ue1-boilingdata-demo-isecurefi-dev-and-all-th-f2064da5f64ab6d",
      Tags: [
        {
          Key: "service",
          Value: "boilingdata",
        },
      ],
    });
  });
});
