import { GRANT_PERMISSION } from "./boilingdata/dataset.interface.js";
const RO_ACTIONS = ["s3:GetObject"];
const WO_ACTIONS = ["s3:PutObject"];
const RW_ACTIONS = ["s3:PutObject", "s3:GetObject"];
const BUCKET_ACTIONS = ["s3:ListBucket", "s3:GetBucketLocation", "s3:GetBucketRequestPayment"];
export class BDIntegration {
    params;
    logger;
    bdDatasets;
    constructor(params) {
        this.params = params;
        this.logger = this.params.logger;
        this.bdDatasets = this.params.bdDataSources;
    }
    mapDatasetsToUniqBuckets(statements) {
        const uniqBuckets = [...new Set(statements.map(policy => policy.bucket))];
        return uniqBuckets.map(bucket => `arn:aws:s3:::${bucket}`);
    }
    mapAccessPolicyToS3Resource(statements) {
        return statements.map(stmt => `arn:aws:s3:::${stmt.bucket}/${stmt.prefix}*`);
    }
    getStatement(datasets, actions, func) {
        if (Array.isArray(datasets) && datasets.length > 0)
            return { Effect: "Allow", Action: actions, Resource: func(datasets) };
    }
    getGroupedBuckets() {
        const dataSourcesConfig = this.bdDatasets.getDatasourcesConfig();
        const allPolicies = dataSourcesConfig.dataSources
            .map(d => {
            console.log(d);
            d.accessPolicy = d.accessPolicy.map(pol => {
                if (!pol.permissions)
                    pol.permissions = [GRANT_PERMISSION.G_READ]; // default
                return pol;
            });
            return d.accessPolicy;
        })
            .flat();
        this.logger.debug({ allPolicies });
        if (allPolicies.some(policy => !policy.permissions))
            throw new Error("Missing policy permissions");
        const readOnly = allPolicies
            .filter(policy => !policy.permissions?.includes(GRANT_PERMISSION.G_WRITE) &&
            policy.permissions?.includes(GRANT_PERMISSION.G_READ))
            .map(policy => ({
            ...policy,
            bucket: new URL(policy.urlPrefix).host,
            prefix: new URL(policy.urlPrefix).pathname.substring(1),
        }));
        const readWrite = allPolicies
            .filter(policy => policy.permissions?.includes(GRANT_PERMISSION.G_WRITE) &&
            policy.permissions?.includes(GRANT_PERMISSION.G_READ))
            .map(policy => ({
            ...policy,
            bucket: new URL(policy.urlPrefix).host,
            prefix: new URL(policy.urlPrefix).pathname.substring(1),
        }));
        const writeOnly = allPolicies
            .filter(policy => policy.permissions?.includes(GRANT_PERMISSION.G_WRITE) &&
            !policy.permissions?.includes(GRANT_PERMISSION.G_READ))
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
        const Statements = [];
        Statements.push(this.getStatement(grouped.readOnly, RO_ACTIONS, this.mapAccessPolicyToS3Resource.bind(this)));
        Statements.push(this.getStatement(grouped.readWrite, RW_ACTIONS, this.mapAccessPolicyToS3Resource.bind(this)));
        Statements.push(this.getStatement(grouped.writeOnly, WO_ACTIONS, this.mapAccessPolicyToS3Resource.bind(this)));
        Statements.push(this.getStatement(allDatasets, BUCKET_ACTIONS, this.mapDatasetsToUniqBuckets.bind(this)));
        Statements.push({
            Effect: "Allow",
            Action: "s3:ListAllMyBuckets",
            Resource: "*",
        });
        const finalPolicy = { Version: "2012-10-17", Statement: Statements.filter(s => s?.Resource?.length) };
        this.logger.debug({ getPolicyDocument: JSON.stringify(finalPolicy) });
        return finalPolicy;
    }
}
