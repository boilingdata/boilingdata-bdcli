"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BDIntegration = void 0;
const dataset_interface_js_1 = require("./boilingdata/dataset.interface.js");
const RO_ACTIONS = ["s3:GetObject"];
const WO_ACTIONS = ["s3:PutObject"];
const RW_ACTIONS = ["s3:PutObject", "s3:GetObject"];
const BUCKET_ACTIONS = ["s3:ListBucket", "s3:GetBucketLocation", "s3:GetBucketRequestPayment"];
class BDIntegration {
    params;
    logger;
    // private bdAccount: BDAccount;
    // private bdRole: BDIamRole;
    bdDatasets;
    constructor(params) {
        this.params = params;
        this.logger = this.params.logger;
        // this.bdAccount = this.params.bdAccount;
        // this.bdRole = this.params.bdRole;
        this.bdDatasets = this.params.bdDataSources;
        // this.logger.debug({ account: this.bdAccount, role: this.bdRole, datasets: this.bdDatasets });
    }
    mapDatasetsToUniqBuckets(statements) {
        const uniqBuckets = [...new Set(statements.map(policy => policy.bucket))];
        return uniqBuckets.map(bucket => `arn:aws:s3:::${bucket}`);
    }
    mapAccessPolicyToS3Resource(statements) {
        return statements.map(stmt => `arn:aws:s3:::${stmt.bucket}/${stmt.prefix}*`);
    }
    getStatement(datasets, actions, func) {
        return { Effect: "Allow", Action: actions, Resource: func(datasets) };
    }
    getGroupedBuckets() {
        const dataSourcesConfig = this.bdDatasets.dataSourcesConfig;
        const allPolicies = dataSourcesConfig.dataSources.map(d => d.accessPolicy).flat();
        const readOnly = allPolicies
            .filter(policy => !policy.permissions?.includes(dataset_interface_js_1.G_WRITE) && policy.permissions?.includes(dataset_interface_js_1.G_READ))
            .map(policy => ({
            ...policy,
            bucket: new URL(policy.urlPrefix).host,
            prefix: new URL(policy.urlPrefix).pathname.substring(1),
        }));
        const readWrite = allPolicies
            .filter(policy => policy.permissions?.includes(dataset_interface_js_1.G_WRITE) && policy.permissions?.includes(dataset_interface_js_1.G_READ))
            .map(policy => ({
            ...policy,
            bucket: new URL(policy.urlPrefix).host,
            prefix: new URL(policy.urlPrefix).pathname.substring(1),
        }));
        const writeOnly = allPolicies
            .filter(policy => policy.permissions?.includes(dataset_interface_js_1.G_WRITE) && !policy.permissions?.includes(dataset_interface_js_1.G_READ))
            .map(policy => ({
            ...policy,
            bucket: new URL(policy.urlPrefix).host,
            prefix: new URL(policy.urlPrefix).pathname.substring(1),
        }));
        return { readOnly, readWrite, writeOnly };
    }
    async getPolicyDocument() {
        const grouped = this.getGroupedBuckets();
        const allDatasets = [...grouped.readOnly, ...grouped.readWrite, ...grouped.writeOnly];
        const Statement = [];
        Statement.push(this.getStatement(grouped.readOnly, RO_ACTIONS, this.mapAccessPolicyToS3Resource.bind(this)));
        Statement.push(this.getStatement(grouped.readWrite, RW_ACTIONS, this.mapAccessPolicyToS3Resource.bind(this)));
        Statement.push(this.getStatement(grouped.writeOnly, WO_ACTIONS, this.mapAccessPolicyToS3Resource.bind(this)));
        Statement.push(this.getStatement(allDatasets, BUCKET_ACTIONS, this.mapDatasetsToUniqBuckets.bind(this)));
        Statement.push({
            Effect: "Allow",
            Action: "s3:ListAllMyBuckets",
            Resource: "*",
        });
        const finalPolicy = { Version: "2012-10-17", Statement: Statement.filter(s => s.Resource.length) };
        this.logger.debug({ getPolicyDocument: JSON.stringify(finalPolicy) });
        return finalPolicy;
    }
}
exports.BDIntegration = BDIntegration;
