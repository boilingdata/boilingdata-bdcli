import { ELogLevel, getLogger } from "../../bdcli/utils/logger_util.js";
import { IBDIamRole, BDIamRole } from "./iam_roles.js";
import {
  CreatePolicyCommand,
  CreatePolicyVersionCommand,
  CreateRoleCommand,
  DeletePolicyVersionCommand,
  GetRoleCommand,
  IAMClient,
  ListPolicyVersionsCommand,
} from "@aws-sdk/client-iam";
import { GetCallerIdentityCommand, STSClient } from "@aws-sdk/client-sts";
import { mockClient } from "aws-sdk-client-mock";

const iamMock = mockClient(IAMClient);
const stsMock = mockClient(STSClient);

const logger = getLogger("iam-role-tests");
logger.setLogLevel(ELogLevel.DEBUG);

const region = "us-east-1";
const roleParams: IBDIamRole = {
  logger,
  iamClient: new IAMClient({ region }),
  stsClient: new STSClient({ region }),
  region,
  uniqNamePart: "boilingdata-demo-isecurefi-dev-and-all-the-rest-of-the-buckets",
  assumeAwsAccount: "123123123123",
  assumeCondExternalId: "abcdef123123",
};

const dummyRole = {
  Path: "dummyPath",
  RoleName: "dummyRoleName",
  RoleId: "dummyRoleId",
  Arn: "dummyArn",
  CreateDate: undefined,
};

const dummyPolicy = JSON.stringify({});

describe("iamRole", () => {
  beforeEach(() => {
    iamMock.reset();
    stsMock.reset();
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

  it("createRole - role and policy already exists", async () => {
    stsMock.on(GetCallerIdentityCommand).resolves({ Account: "123123123123" });
    iamMock.on(ListPolicyVersionsCommand).resolves({ Versions: [{ VersionId: "dummyVersion" }] });
    iamMock.on(CreatePolicyVersionCommand).resolves({ PolicyVersion: { VersionId: "dummyVersionX" } });
    iamMock.on(GetRoleCommand).resolves({ Role: dummyRole });
    iamMock.on(CreateRoleCommand).resolves({ Role: dummyRole });
    const role = new BDIamRole(roleParams);
    expect(await role.upsertRole(dummyPolicy)).toEqual("dummyArn");
  });

  it("createRole - role already exists, no policy", async () => {
    stsMock.on(GetCallerIdentityCommand).resolves({ Account: "123123123123" });
    iamMock.on(ListPolicyVersionsCommand).resolves({ Versions: [] });
    iamMock.on(CreatePolicyCommand).resolves({
      Policy: {
        Arn:
          "arn:aws:iam::123123123123:policy/boilingdata/" +
          "bd-ue1-boilingdata-demo-isecurefi-dev-and-all-th-f2064da5f64ab6d",
      },
    });
    iamMock.on(GetRoleCommand).resolves({ Role: dummyRole });
    iamMock.on(CreateRoleCommand).resolves({ Role: dummyRole });
    const role = new BDIamRole(roleParams);
    expect(await role.upsertRole(dummyPolicy)).toEqual("dummyArn");
  });

  it("createRole - role already exists, 5 policy versions already", async () => {
    stsMock.on(GetCallerIdentityCommand).resolves({ Account: "123123123123" });
    iamMock.on(ListPolicyVersionsCommand).resolves({
      Versions: [
        { VersionId: "dummyVersion1" },
        { VersionId: "dummyVersion2" },
        { VersionId: "dummyVersion3" },
        { VersionId: "dummyVersion4" },
        { VersionId: "dummyVersion5" },
      ],
    });
    iamMock.on(DeletePolicyVersionCommand).resolves({});
    iamMock.on(CreatePolicyVersionCommand).resolves({ PolicyVersion: { VersionId: "dummyVersionX" } });
    iamMock.on(GetRoleCommand).resolves({ Role: dummyRole });
    iamMock.on(CreateRoleCommand).resolves({ Role: dummyRole });
    const role = new BDIamRole(roleParams);
    expect(await role.upsertRole(dummyPolicy)).toEqual("dummyArn");
  });

  it("createRole - does not yet exist", async () => {
    stsMock.on(GetCallerIdentityCommand).resolves({ Account: "123123123123" });
    iamMock.on(CreatePolicyCommand).resolves({
      Policy: {
        Arn:
          "arn:aws:iam::123123123123:policy/boilingdata/" +
          "bd-ue1-boilingdata-demo-isecurefi-dev-and-all-th-f2064da5f64ab6d",
      },
    });
    iamMock.on(CreateRoleCommand).resolves({ Role: dummyRole });
    const role = new BDIamRole(roleParams);
    expect(await role.upsertRole(dummyPolicy)).toEqual("dummyArn");
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
});
