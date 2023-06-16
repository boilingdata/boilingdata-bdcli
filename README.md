# bdcli - BoilingData Configuration Tool

## TL;DR

```shell
npm install -g @boilingdata/boilingdata-bdcli
```

Register at [app.boiilngdata.com](https://app.boilingdata.com) and create an IAM Role assumable by BoilingData.

```shell
% bdcli setup account \
  --email myBoilingRegisteredEmail@something.com \
  --password 'mySuperSecretPw' \
  --create-config-only

% echo "version: 1.0
dataSources:
  - name: demo
    type: s3
    accessPolicy:
      - id: bd-test-policy
        urlPrefix: s3://my-bucket/and/prefix
" > dataset_config.yaml

% bdcli setup iam-role -c dataset_config.yaml --region eu-west-1 --create-role-only
✔ Authenticating: success
✔ Creating IAM Role: arn:aws:iam::123123123123:role/boilingdata/bd-ew1-demo-0ccb08a39c45a24

% echo "Now you can verify the generated IAM role"
Now you can verify the generated IAM role

% AWS_REGION=eu-west-1 bdcli setup iam-role -c dataset_config.yaml
✔ Authenticating: success
✔ Creating IAM Role: arn:aws:iam::123123123123:role/boilingdata/bd-ew1-demo-0ccb08a39c45a24
✔ Registering IAM Role: arn:aws:iam::123123123123:role/boilingdata/bd-ew1-demo-0ccb08a39c45a24
```

## Introduction

`bdcli` is used to grant access for BoilingData to your selected S3 data in your AWS Account.

`bdcli` creates the needed IAM Role into your AWS Account based on the configuration file that you provide, and sets the IAM Role ARN into your BoilingData user account configuration.

The created IAM Roles have least-privilege permissions that BoilingData needs. For example, the IAM Role created from below configuration, would allow getting the S3 Bucket location for query routing purposes, and getting the `demo*` objects from `boilingdata-demo` S3 Bucket.

```yaml
version: 1.0
uniqNamePart: myBdIamRole
dataSources:
  - name: demo
    type: s3
    accessPolicy:
      - id: bd-demo-policy
        urlPrefix: s3://boilingdata-demo/demo
        permissions:
          - read
    dataSets:
      - name: demo
        urlPrefix: s3://boilingdata-demo/demo.parquet
      - name: demo2
        urlPrefix: s3://boilingdata-demo/demo2.parquet
```

### Credentials Integration

Assumable IAM Role integration works as long as your IAM Role allows Boiling to assume the role. E.g. if you delete the IAM Role, Boiling can not access your data anymore. You can use `bdcli` to delete the generated IAM Role.

## Install

```shell
yarn install boilingdata/boilingdata-bdcli
npx bdcli -h
```

## Data Sources configuration file

Data Sources (sandboxes) can be defined in a yaml file. Currently, only S3 is supported.

```yaml
version: 1.0
uniqNamePart: myBdIamRoleOptionalParam # opt. deterministic uniq role id
dataSources: # list
  - name: demo
    type: s3 # "s3"
    sessionType: assumeRole # "assumeRole"
    accessPolicy:
      - id: bd-demo-policy # string
        urlPrefix: s3://boilingdata-demo/demo # string, for now must be S3 URL
        permissions: # list: "read", "write"
          - read
      - id: nyc-policy
        urlPrefix: s3://isecurefi-dev-test/nyc-tlc/
        permissions:
          - read
          - write
    dataSets: # list
      - name: demo # file unique string
        urlPrefix: s3://boilingdata-demo/demo.parquet # string, for now must be S3 URL
      - name: demo2
        urlPrefix: s3://boilingdata-demo/demo2.parquet
      - name: nyc
        urlPrefix: s3://isecurefi-dev-test/nyc-tlc/trip_data/
        layout: hive # "hive", "folder", "file"
        filetype: parquet # "parquet", "json", "csv"
  - name: logs
    type: s3
    accessPolicy:
      - id: logs-policy
        urlPrefix: s3://logs-bucket/
    dataSets:
      - name: s3AccessLogs
        urlPrefix: s3://logs-bucket/s3_access/
```

## Code Architecture & Development

- `src/integration/` contains integration between aws and boilingdata. Code that is agnostic to command line args handling. Keep the code decoupled with clear interfaces so that it could be moved as a separate node module (SDK) in the future if needed.
- `src/bdcli/` contains all the client commands in their own directories. Keep the code lightweight and focus on command line args handling and wiring with utils and core functionality. Goal is to be able to create PRs that add new functionality by adding new files without having to modify other commmands.
- `src/utils/` general utilities consumed by multiple `bdcli` commands. Includes for example authentication handling and logging.

```shell
yarn build
ln -fs dist/esm/index.js bdcli && chmod 755 bdcli
./bdcli
```
