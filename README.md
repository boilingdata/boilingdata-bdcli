# bdcli - BoilingData Configuration Tool

See [ONBOARDING.md](ONBOARDING.md) for step by step walk through.

## TL;DR

You can use BDCLI to:

- Register and managed your BoilingData account
- [Deploy and manage Data Taps](https://www.taps.boilingdata.com/) (`bdcli sandbox`), including integration with your AWS Account (if you have one), share and consume data sets to/from other users
- Run Boiling API queries, get signed WSS URL for using e.g. with `wscat` or other tools able to connect to WebSockets (like [Mosaic duckdb-server](https://uwdata.github.io/mosaic/duckdb/))

> See also our simple stateless demo application [app.boilingdata.com](https://app.boilingdata.com).

```shell
% npm install -g @boilingdata/boilingdata-bdcli
% bdcli
Usage: bdcli [options] [command]

Options:
  -V, --version   output the version number
  -h, --help      display help for command

Commands:
  account         Setup and configure your BoilingData account
  aws             Setup and configure your AWS account integration with BoilingData
  domain          Admin setup and configuration for your domain (.e.g @boilingdata.com, @mycompany.com)
  sandbox         Managa Boiling S3 Sandboxes with IaC templates
  api             Boiling query API operations: run SQL, get signed WSS URL etc.
  help [command]  display help for command

% bdcli api query -s "SELECT * FROM parquet_scan('s3://boilingdata-demo/test.parquet') LIMIT 2;" --disable-spinner
[
  {
    "id": 1,
    "first_name": "Amanda",
    "last_name": "Jordan"
  }
]
```

You can create BoilingData assumable IAM role into your AWS account with clear scope. The IAM Role is in your AWS account, you can review, and modify it if you like.

```shell
% echo "version: 1.0
dataSource:
  name: demo
  permissions:
    - urlPrefix: s3://my-bucket/and/prefix
      accessRights:
        - read
        - write
" > datasource_config.yaml

% bdcli aws iam -c datasource_config.yaml --region eu-west-1 --create-role-only
✔ Authenticating: success
✔ Creating IAM Role: arn:aws:iam::589434896614:role/boilingdata/bd-euw1-noenv-notmplname-21346bf26c314caf8e7e9832205ffdee

% echo "Now you can verify the generated IAM role"
Now you can verify the generated IAM role

% bdcli aws iam -c datasource_config.yaml
✔ Authenticating: success
✔ Creating IAM Role: arn:aws:iam::123123123123:role/boilingdata/bd-ew1-demo-0ccb08a39c45a24
✔ Registering IAM Role: arn:aws:iam::123123123123:role/boilingdata/bd-ew1-demo-0ccb08a39c45a24
```

## Introduction

`bdcli` is used to grant access for BoilingData to your selected S3 data in your AWS Account. It is also used to fully manage your BoilingData account, like changing password, setting up MFA, recovering password etc. It uses `~/.bdcli.yaml` configuration file for storing both settings and caching access (session) tokens.

You can use `bdcli` to optionally create the needed IAM Role into your AWS Account based on the configuration file that you provide, and sets the IAM Role ARN into your BoilingData user account configuration. However, if you don't have an AWS Account or do not want to use boiling over your data, you can consume data from others only.

The created IAM Roles have least-privilege permissions that BoilingData needs. For example, the IAM Role created from below configuration, would allow getting the S3 Bucket location for query routing purposes, and getting the `demo*` objects from `boilingdata-demo` S3 Bucket.

> NOTE: Assumable IAM Role integration works as long as your IAM Role allows Boiling to assume the role. E.g. if you delete the IAM Role, Boiling can not access your data anymore.

## Secure and controlled data sharing between users

Please see [TOKEN_SHARING.md](TOKEN_SHARING.md) for more details and background on how to share the capability of vending access tokens between users. Access tokens are used to authorize queries to access data, and thus allow users to query other users data.

## Boiling settings file ~/.bdcli.yaml

You start initially with:

```shell
bdcli account config
```

This sets your username (valid email address) and password. If you like, you opt out setting the password into the configuration file with `--no-password`. In this case `bdcli` asks the password every time you run it and require login to Boiling, e.g. in case local cached session tokens have expired.

Boiling settings file supports multiple profiles, if you like. You can set the profile with `BD_PROFILE` environment variable, or pass `--profile <selected-profile>` global option. Additionally, `bdcli` picks up all environment variables that start with `BD_` prefix and convert the rest of the string as camelCase option. The same happens with `settings` block under the profile in the configuration file.

Here is a minimal configuration file that does not yet have any cached session tokens. Also, password field is missing, meaning that `bdcli` will ask the password from the user. Status messages are suppressed due to the `disableSpinner` setting set to `true`. When status messages are suppressed the output from `bdcli` is unformatted JSON.

```yaml
# No "default" profile, so user has to give profile via BD_ENV or --profile option.
demo: # profile demo
  settings:
    disableSpinner: true
    debug: false
  credentials:
    email: demo@boilingdata.com
dforsber: # profile dforsber
  settings:
    disableSpinner: false
    debug: true
  credentials:
    email: dforsber@gmail.com
```

## Data access configuration file

A YAML configuration file is used to create the IAM Role.

```yaml
version: 1.0
dataSource:
  name: demo
  permissions:
    - urlPrefix: s3://my-bucket/and/prefix
      accessRights:
        - read
        - write
```

## Direct access from DuckDB

You use DuckDB command line client or e.g. [DuckDB ODBC](https://duckdb.org/docs/api/odbc/overview.html) driver to access BoilingData.

```shell
% ./bdcli account sts-token --profile demo --duckdbrc
% duckdb
D INSTALL httpfs;
D LOAD httpfs;
```

```shell
% ./bdcli account sts-token --profile demo --duckdb-macro --disable-spinner | jq -r '.duckDbMacro'
-- BoilingData DuckDB Table Macro START
CREATE OR REPLACE TEMP MACRO boilingdata(sql) AS TABLE SELECT * FROM parquet_scan('https://httpfs.api.test.boilingdata.com/httpfs?bdStsToken=eyJhbG..ZJJm0w&sql=' || regexp_replace(regexp_replace(sql, '>', '%3E', 'g'), '<', '%3C', 'g'));
-- BoilingData DuckDB Table Macro END
% duckdb
D INSTALL httpfs;
D LOAD httpfs;
D CREATE OR REPLACE TEMP MACRO boilingdata(sql) AS TABLE SELECT * FROM parquet_scan('https://httpfs.api.test.boilingdata.com/httpfs?bdStsToken=eyJhbG..ZJJm0w&sql=' || regexp_replace(regexp_replace(sql, '>', '%3E', 'g'), '<', '%3C', 'g'));
D SELECT * FROM boilingdata('SELECT * FROM parquet_scan(''s3://boilingdata-demo/test.parquet'') LIMIT 100;');
```

# Code Architecture & Development

- `src/integration/` contains integration between AWS and BoilingData. Code that is agnostic to command line args handling. Keep the code decoupled with clear interfaces so that it could be moved as a separate node module (SDK) in the future if needed.
- `src/bdcli/` contains all the client commands in their own directories. Keep the code lightweight and focus on command line args handling and wiring with utils and core functionality. Goal is to be able to create PRs that add new functionality by adding new files without having to modify other commmands.
- `src/utils/` general utilities consumed by multiple `bdcli` commands. Includes for example authentication handling and logging.

To test the command line client locally, you can create a symbolic link to the index.js file while also making it executable

```shell
git checkout git@github.com:boilingdata/boilingdata-bdcli.git
cd boilingdata-bdcli
npm install
npm run build
npm install -g .
bdcli -h
```

### TODO

- [_] Add shell auto completion with [omelette](https://github.com/f/omelette).
