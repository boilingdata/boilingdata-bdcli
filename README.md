# bdcli - BoilingData Configuration Tool

## TL;DR

```shell
npm install -g boilingdata/boilingdata-bdcli
```

Register at [app.boiilngdata.com](https://app.boilingdata.com) and create a one-off-access S3 sandbox readable by BoilingData with short term session credentials (AWS STS).

```shell
bdcli setup account
bdcli setup iam-role -c example_dataset_config.yaml --region eu-west-1
```

## Introduction

`bdcli` is used to deploy BoilingData Data Sources - **sandboxes**. These are e.g. S3 data access configurations with permissions and locations (buckets and prefixes). `bdcli` creates the needed IAM Role(s) into your AWS Account and updates your existing BoilingData user account configurations. Once the IAM Role is configured into your BoilingData account, you access your data with Boiling.

The created IAM Roles have least-privilege permissions that BoilingData needs. For example, the IAM Role created from below configuration, would allow getting the S3 Bucket location for query routing purposes, and getting the `demo*` objects from `boilingdata-demo` S3 Bucket.

```yaml
version: 1.0
dataSources:
  - name: demo
    type: s3
    sessionType: assumeRole
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

## Code Architecture & Development

- `src/integration/` contains integration between aws and boilingdata. Code that is agnostic to command line args handling. Keep the code decoupled with clear interfaces so that it could be moved as a separate node module (SDK) in the future if needed.
- `src/bdcli/` contains all the client commands in their own directories. Keep the code lightweight and focus on command line args handling and wiring with utils and core functionality. Goal is to be able to create PRs that add new functionality by adding new files without having to modify other commmands.
- `src/utils/` general utilities consumed by multiple `bdcli` commands. Includes for example authentication handling and logging.

```shell
yarn build
BD_USERNAME=<username> BD_PASSWORD=<password> ./bdcli -h
```

## Data Sources configuration file

Data Sources (sandboxes) can be defined in a yaml file. Currently, only S3 is supported.

```shell
version: 1.0
dataSources:                                                       # list
  - name: demo
    type: s3                                                       # "s3"
    sessionType: assumeRole                                        # "assumeRole"
    accessPolicy:
      - id: bd-demo-policy                                         # string
        urlPrefix: s3://boilingdata-demo/demo                      # string, for now must be S3 URL
        permissions:                                               # list: "read", "write"
          - read
      - id: nyc-policy
        urlPrefix: s3://isecurefi-dev-test/nyc-tlc/
        permissions:
          - read
          - write
    dataSets:                                                      # list
      - name: demo                                                 # file unique string
        urlPrefix: s3://boilingdata-demo/demo.parquet              # string, for now must be S3 URL
      - name: demo2
        urlPrefix: s3://boilingdata-demo/demo2.parquet
      - name: nyc
        urlPrefix: s3://isecurefi-dev-test/nyc-tlc/trip_data/
        layout: hive                                               # "hive", "folder", "file"
        filetype: parquet                                          # "parquet", "json", "csv"
  - name: logs
    type: s3
    accessPolicy:
      - id: logs-policy
        urlPrefix: s3://logs-bucket/
    dataSets:
      - name: s3AccessLogs
        urlPrefix: s3://logs-bucket/s3_access/
```
