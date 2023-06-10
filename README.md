# bdcli - AWS Integration Configuration Tool for BoilingData

## TL;DR

```shell
npm install -g boilingdata/boilingdata-bdcli
```

Register at [app.boiilngdata.com](https://app.boilingdata.com) and create a one-off-access S3 sandbox readable by BoilingData with short term session credentials (AWS STS).

```shell
bdcli setup account
bdcli setup iam-role
```

## Introduction

`bdcli` is used to deploy BoilingData **sandboxes** - S3 data access configurations. It creates the needed IAM Role(s) into your AWS Account and updates your existing BoilingData user account configurations. You access the sandboxes with BoilingData by running interactive-speed queries over your data on S3 defined by these sandboxes.

The created IAM Roles have least-privilege permissions that BoilingData needs. For example, the IAM Role created from below sandbox configuration file, would allow getting the S3 Bucket location for query routing purposes, and getting the `demo.parquet` object from `boilingdata-demo` S3 Bucket.

When deploying this configuration, `bdcli` will assume the created IAM Role and more specifically only store the Short Term Session (STS) credentials into your BoilingData user account (`access_type: sts`). This way BoilingData has one-off access to your sandbox, i.e. once the credentials expire (typically after 1h), BoilingData is not able to access your data anymore, unless you re-deploy the configuration.

Alternatively, you can use `access_type: assume_role` where the created IAM Role is assumable by BoilingData, meaning also that BoilingData has access to the sandbox data as long as the IAM Role exists and is assumable by BoilingData.

```yaml
version: 1.0
boilingdata:
  sandboxes:
    demo:
      - source_type: s3
        access_type: sts
        permissions:
          - read
        buckets:
          - boilingdata-demo
        prefixes:
          - demo.parquet
```

### Sandboxes

You can create sandboxes that you open with BoilingData for interacting with your data. Boiling has only access to e.g. specific S3 Bucket and S3 Key prefixes in your account - as you specify. To create the sandboxes, you create data set configurations (metadata) that point to your S3 bucket(s) and S3 Key prefixes. Then this tool can create a tailored IAM Role that has access to that data, either read-only or read-write.

> You need to register to BoilingData if you want to interact with Boiling. However, you can use this tool to check what resources are created into your AWS Account for seamless integration with BoilingData.

### Credentials Integration

For each of the Sandboxes you can either configure assumable IAM Role or short term session (STS) credentials. The IAM Role alternative is a _static integration_, fully controlled by you, as you can remove the role and change its scope whenever you like - as the IAM Role resides in your AWS Account. Alternatively, you can create STS credentials with the same generated IAM Role and only pass these credentials to Boiling (i.e. Boiling does not assume the IAM Role but uses session credentials passed by you). This is a _temporary integration_ and lasts typically one hour (depending on the lifetime you request for the STS credentials).

Seamless BoilingData AWS integration has two options:

- Short Term Session (STS) credentials, or
- Boiling assumable IAM Role.

Assumable IAM Role integration works as long as your IAM Role allows Boiling to assume the role. On the other hand, short term session credentials are created by you and uploaded into Boiling, so that Boiling can access resources that your session credentials allow for the duration of the session credentials (typically 1h). Once the STS credentials have expired, Boiling has no access to your resources. This means, that whenever you want to use Boiling again, you first issue the STS credentials and upload them into Boiling.

## Install

```shell
yarn install boilingdata/boilingdata-bdcli
npx bdcli -h
```

## Code Architecture & Development

- `src/core/` core functionality code that is agnostic to command line args handling. Keep the code decoupled with clear interfaces so that it could be moved as a separate node module (SDK) in the future if needed. Agnostic to command line args parsing, logging, and authentication handling, i.e. can work with the `src/utils/` utilities.
- `src/bdcli/` contains all the client commands in their own directories. Keep the code lightweight and focus on command line args handling and wiring with utils and core functionality. Goal is to be able to create PRs that add new functionality by adding new files without having to modify other commmands.
- `src/utils/` general utilities consumed by multiple `bdcli` commands. Includes for example authentication handling and logging.

```shell
yarn build
BD_USERNAME=<username> BD_PASSWORD=<password> ./bdcli -h
```

## Defining Sandboxes in a configuration file

Sandboxes can be defined in a yaml file. Currently, only AWS S3 sandboxes are supported.

> Please note that BoilingData does not require sandboxes as it can query any data location that the configured credentials allow. However, defining sandboxes helps to organise data sources and data sets in a familiar way, but also for creating metadata and catalogues.

```yaml
version: 1.0
boilingdata:
  sandboxes:
    demo:
      - type: s3
        permissions: read
        buckets:
          - boilingdata-demo
        prefixes:
          - demo.parquet
        permissions: read
    bdcli_logs:
      - type: s3
        permissions: read
        buckets:
          - boilingdata-dev
        prefixes:
          - bdcli_s3_logs/
        format: json
        json_schema_file: "bdcli_logfiles.schema.json"
```

# Possible to-be-implemented features and ideas

- [ ] Stream logs to S3, consider using e.g. [s3-streamlogger](https://github.com/Coggle/s3-streamlogger)
