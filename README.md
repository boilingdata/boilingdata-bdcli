# bdcli - AWS Integration Configuration Tool for BoilingData

## Introduction

This tool is used to configure BoilingData **Sandboxes** - S3 data access configurations. It calls your AWS Account API interfaces similarly to `aws cli`.

Once you have configurations ready and deployed, you push them to BoilingData. You access these configurations with BoilingData and run interactive-speed queries over your S3 cold data.

For each of the Sandboxes you can either configure assumable IAM Role or short term session (STS) credentials. The IAM Role alternative is a _continuous integration_, fully controlled by you, as you can remove the role and change its scope whenever you like - as the IAM Role resides in your AWS Account. Alternatively, you can create STS credentials with the same generated IAM Role and only pass these credentials to Boiling (i.e. Boiling does not assume the IAM Role but uses session credentials passed by you). This is a _one-off integration_ and lasts typically one hour (depending on the lifetime you request for the STS credentials).

### Sandboxes

You can create sandboxes that you open with BoilingData for interacting with your data. Boiling has only access to e.g. specific S3 Bucket and S3 Key prefixes in your account - as you specify. To create the sandboxes, you create data set configurations (metadata) that point to your S3 bucket(s) and S3 Key prefixes. Then this tool can create a tailored IAM Role that has access to that data, either read-only or read-write.

> You need to register to BoilingData if you want to interact with Boiling. However, you can use this tool to check what resources are created into your AWS Account for seamless integration with BoilingData.

### Credentials Integration

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

# Possible to-be-implemented features and ideas

- [ ] Stream logs to S3, consider using e.g. [s3-streamlogger](https://github.com/Coggle/s3-streamlogger)
