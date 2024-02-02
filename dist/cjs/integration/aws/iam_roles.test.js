"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const logger_util_js_1 = require("../../bdcli/utils/logger_util.js");
const iam_roles_js_1 = require("./iam_roles.js");
const client_iam_1 = require("@aws-sdk/client-iam");
const client_sts_1 = require("@aws-sdk/client-sts");
const aws_sdk_client_mock_1 = require("aws-sdk-client-mock");
const iamMock = (0, aws_sdk_client_mock_1.mockClient)(client_iam_1.IAMClient);
const stsMock = (0, aws_sdk_client_mock_1.mockClient)(client_sts_1.STSClient);
const logger = (0, logger_util_js_1.getLogger)("iam-role-tests");
logger.setLogLevel(logger_util_js_1.ELogLevel.DEBUG);
const region = "us-east-1";
const roleParams = {
    logger,
    iamClient: new client_iam_1.IAMClient({ region }),
    stsClient: new client_sts_1.STSClient({ region }),
    region,
    username: "aac5c1d9-a0a9-4855-b896-0f3998b2f16b",
    assumeAwsAccount: "123123123123",
    assumeCondExternalId: "abcdef123123",
};
const dummyRole = {
    Path: "/boilingdata/",
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
        const role = new iam_roles_js_1.BDIamRole(roleParams);
        expect(role.iamRoleName).toEqual("bd-use1-noenv-notmplname-aac5c1d9a0a94855b8960f3998b2f16b");
    });
    it("getIamRoleName with own prefix", async () => {
        const role = new iam_roles_js_1.BDIamRole({ ...roleParams, roleNamePrefix: "my" });
        expect(role.iamRoleName).toEqual("my-use1-noenv-notmplname-aac5c1d9a0a94855b8960f3998b2f16b");
    });
    it("getIamRoleName with own path and prefix", async () => {
        const role = new iam_roles_js_1.BDIamRole({ ...roleParams, roleNamePrefix: "my", path: "/bd-service/demo/" });
        expect(role.iamRoleName).toEqual("my-use1-noenv-notmplname-aac5c1d9a0a94855b8960f3998b2f16b");
    });
    it("getRole", async () => {
        iamMock.on(client_iam_1.GetRoleCommand).resolves({ Role: dummyRole });
        const role = new iam_roles_js_1.BDIamRole(roleParams);
        expect(await role.getRole()).toEqual(dummyRole);
    });
    it("createRole - a role and policy already exists", async () => {
        stsMock.on(client_sts_1.GetCallerIdentityCommand).resolves({ Account: "123123123123" });
        iamMock.on(client_iam_1.ListPoliciesCommand).resolves({
            Policies: [
                {
                    PolicyName: "bd-ue1-boilingdata-demo-isecurefi-dev-and-all-th-acff8dae429911f",
                    Arn: "arn:aws:iam::123123123123:policy/" +
                        "boilingdata/bd-use1-noenv-notmplname-aac5c1d9a0a94855b8960f3998b2f16b-policy",
                    Path: "/boilingdata/",
                    DefaultVersionId: "v123",
                    AttachmentCount: 1,
                },
            ],
        });
        iamMock.on(client_iam_1.ListPolicyVersionsCommand).resolves({ Versions: [{ VersionId: "dummyVersion" }] });
        iamMock.on(client_iam_1.CreatePolicyVersionCommand).resolves({ PolicyVersion: { VersionId: "dummyVersionX" } });
        iamMock.on(client_iam_1.GetRoleCommand).resolves({ Role: dummyRole });
        iamMock.on(client_iam_1.CreateRoleCommand).resolves({ Role: dummyRole });
        const role = new iam_roles_js_1.BDIamRole(roleParams);
        expect(await role.upsertRole(dummyPolicy)).toEqual("dummyArn");
    });
    it("createRole - role already exists, no policy", async () => {
        stsMock.on(client_sts_1.GetCallerIdentityCommand).resolves({ Account: "123123123123" });
        iamMock.on(client_iam_1.ListPolicyVersionsCommand).resolves({ Versions: [] });
        iamMock.on(client_iam_1.ListPoliciesCommand).resolves({ Policies: [] });
        iamMock.on(client_iam_1.CreatePolicyCommand).resolves({
            Policy: {
                Arn: "arn:aws:iam::123123123123:policy/boilingdata/" +
                    "bd-ue1-boilingdata-demo-isecurefi-dev-and-all-th-f2064da5f64ab6d",
            },
        });
        iamMock.on(client_iam_1.GetRoleCommand).resolves({ Role: dummyRole });
        iamMock.on(client_iam_1.CreateRoleCommand).resolves({ Role: dummyRole });
        const role = new iam_roles_js_1.BDIamRole(roleParams);
        expect(await role.upsertRole(dummyPolicy)).toEqual("dummyArn");
    });
    it("createRole - role already exists, 5 policy versions already", async () => {
        stsMock.on(client_sts_1.GetCallerIdentityCommand).resolves({ Account: "123123123123" });
        iamMock.on(client_iam_1.ListPoliciesCommand).resolves({
            Policies: [
                {
                    PolicyName: "bd-ue1-boilingdata-demo-isecurefi-dev-and-all-th-acff8dae429911f",
                    Arn: "arn:aws:iam::123123123123:policy/" +
                        "boilingdata/bd-use1-noenv-notmplname-aac5c1d9a0a94855b8960f3998b2f16b-policy",
                    Path: "/boilingdata/",
                    DefaultVersionId: "v100",
                    AttachmentCount: 1,
                },
            ],
        });
        iamMock.on(client_iam_1.ListPolicyVersionsCommand).resolves({
            Versions: [
                {
                    VersionId: "v5",
                    IsDefaultVersion: true,
                },
                {
                    VersionId: "v4",
                    IsDefaultVersion: false,
                },
                {
                    VersionId: "v3",
                    IsDefaultVersion: false,
                },
                {
                    VersionId: "v2",
                    IsDefaultVersion: false,
                },
                {
                    VersionId: "v1",
                    IsDefaultVersion: false,
                },
            ],
        });
        iamMock.on(client_iam_1.DeletePolicyVersionCommand).resolves({});
        iamMock.on(client_iam_1.CreatePolicyVersionCommand).resolves({ PolicyVersion: { VersionId: "dummyVersionX" } });
        iamMock.on(client_iam_1.GetRoleCommand).resolves({ Role: dummyRole });
        iamMock.on(client_iam_1.CreateRoleCommand).resolves({ Role: dummyRole });
        const role = new iam_roles_js_1.BDIamRole(roleParams);
        expect(await role.upsertRole(dummyPolicy)).toEqual("dummyArn");
    });
    it("createRole - does not yet exist", async () => {
        stsMock.on(client_sts_1.GetCallerIdentityCommand).resolves({ Account: "123123123123" });
        iamMock.on(client_iam_1.ListPoliciesCommand).resolves({ Policies: [] });
        iamMock.on(client_iam_1.CreatePolicyCommand).resolves({
            Policy: {
                Arn: "arn:aws:iam::123123123123:policy/boilingdata/" +
                    "bd-ue1-boilingdata-demo-isecurefi-dev-and-all-th-f2064da5f64ab6d",
            },
        });
        iamMock.on(client_iam_1.CreateRoleCommand).resolves({ Role: dummyRole });
        const role = new iam_roles_js_1.BDIamRole(roleParams);
        expect(await role.upsertRole(dummyPolicy)).toEqual("dummyArn");
    });
});
describe("policies", () => {
    it("getAssumeRolePolicyDocument", () => {
        const role = new iam_roles_js_1.BDIamRole(roleParams);
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
