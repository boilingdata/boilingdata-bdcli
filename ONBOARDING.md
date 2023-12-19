# HOWTO to start your Boiling journey

This HOWTO describes how to get started with Boiling using BDCLI.

> This example uses Ubuntu docker instance so that you can, if you like, repeat the steps here regardless of the OS you're using.

- [Getting Started](#getting-started)
  - [0. Create Ubuntu instance with necessary tools (nodejs)](#0-create-ubuntu-instance-with-necessary-tools-nodejs)
  - [1. Install `bdcli`](#1-install-bdcli)
  - [2. Configure Boiling Account and Register](#2-configure-boiling-account-and-register)
  - [3. Run your first query!](#3-run-your-first-query)
- [Advanced Topics](#advanced-topics)
  - [Configure access to your S3 Bucket and prefix](#configure-access-to-your-s3-bucket-and-prefix)
  - [Sharing data sets for others and querying data shared to you](#sharing-data-sets-for-others-and-querying-data-shared-to-you)

## Getting Started

### 0. Create Ubuntu instance with necessary tools (nodejs)

For the purpose of this guid, we use Linux Ubuntu.

```shell
docker run -it ubuntu /bin/bash
# You should be sudo now and inside the docker container..
apt update -y && apt install -y ca-certificates curl gnupg wget unzip
mkdir -p /etc/apt/keyrings
curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
export NODE_MAJOR=18
echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_${NODE_MAJOR}.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list
apt-get update && apt-get install nodejs -y
node -v
> v18.18.2
```

### 1. Install `bdcli`

```shell
npm install -g @boilingdata/boilingdata-bdcli@^1.0.28
bdcli -V
> 1.0.28
```

Alternative install from the source directly

```shell
cd $HOME && apt install -y git
git clone https://github.com/boilingdata/boilingdata-bdcli.git
cd boilingdata-bdcli
npm install
chmod 755 dist/esm/index.js
ln -s dist/esm/index.js bdcli
./bdcli -V
> 1.0.28
```

### 2. Configure Boiling Account and Register

> Please note that the password must be at least 12 characters and contain also some special characters.

> Note that you can have multiple Boiling accounts by using the `--profile` command line option. E.g. for testing purposes you can create two Boiling users, configure AWS IAM Role for the other one and share data set for the other to see how it works.

```shell
bdcli account config
? Please give email > dforsber+bdcli@gmail.com
? Please enter your password › **************
✔ Creating ~/.bdcli.yaml
bdcli account config
✔ Valid configuration already exists for "default" profile
ls -l ~/.bdcli.yaml
-rw------- 1 root root 129 Nov  8 06:16 /root/.bdcli.yaml
```

Once the configuration file has been setup, you can register. Please note that we need to confirm the configured email address by giving the code sent from Boiling (check your email).

```shell
bdcli account register
✔ Registering to BoilingData
bdcli account sts-token
✖ User is not confirmed.
bdcli account register --confirm 123456 # code from your email!
```

### 3. Run your first query!

You don't need AWS account and/or AWS credentials to use Boiling provided that somebody has shared data for you.

Also, your account is pre-configured with AWS IAM Role that allows access to BoilingData demo data, so you can run queries already without configuring AWS side of things.

Before you can use DuckDB client, you need to generate temporary session token with BDCLI, the `--duckdbrc` switch tells BDCLI to store the credentials on DuckDB's rc file, which DuckDB reads when you launch the command line client.

```shell
bdcli account sts-token --duckdbrc
✔ Authenticating: success
✔ Getting BoilingData STS token: cached
✔ Storing DuckDB BoilingData TABLE MACRO
```

Now you have configured access to Boiling into DuckDB command line client through `~/.duckdbrc`. You can have a look at that file to see the MACRO definitions.

Next, we download the duckdb client and run a query against pre-configured Boiling demo data set.

> You need to do this on the same OS user which has the generated `.duckdbrc` file.

> Please note how we embed SQL query into the `boilingdata()` call. The embedded SQL will run on Boiling side on the cloud and the outer SQL runs locally on the duckdb client.

> Using this Boiling httpfs+parquet interface directly from duckdb is experimental and slower than compared to using Boiling Python or JS SDK, BI Tool gateway, or the demo GUI web application. Reason being that the results are delivered as Parquet files, which DuckDB then probes with retries.

```shell
wget https://github.com/duckdb/duckdb/releases/download/v0.9.1/duckdb_cli-linux-amd64.zip
unzip duckdb_cli-linux-amd64.zip
./duckdb -s "SELECT * FROM boilingdata('SELECT id, first_name, email FROM parquet_scan(''s3://boilingdata-demo/test.parquet'') LIMIT 5');"
-- Loading resources from /root/.duckdbrc
┌───────┬────────────┬──────────────────────────┐
│  id   │ first_name │          email           │
│ int32 │  varchar   │         varchar          │
├───────┼────────────┼──────────────────────────┤
│     1 │ Amanda     │ ajordan0@com.com         │
│     2 │ Albert     │ afreeman1@is.gd          │
│     3 │ Evelyn     │ emorgan2@altervista.org  │
│     4 │ Denise     │ driley3@gmpg.org         │
│     5 │ Carlos     │ cburns4@miitbeian.gov.cn │
└───────┴────────────┴──────────────────────────┘
```

## Advanced Topics

### Configure access to your S3 Bucket and prefix

If you want to run queries against your own data and not only shared data, you need to link Boiling to your S3 Bucket and prefix. This happens with cross-account AWS access from Boiling AWS Account to your AWS Account's S3 Bucket.

> The Best-Current-Practice (BCP) for this is configuring an AWS IAM Role into your AWS Account that Boiling can assume. This way, you have full ownership of the data access at any time (i.e. the IAM Role is yours). Furthermore, there are no access credentials configured or stored on Boiling side and when Boiling access data with the IAM Role, Amazon cloud creates unique short lived session credentials. This way, if you e.g. disable/remove/delete the IAM Role, Boiling looses its access to your data immediately (or once possibly vended session credentials expire (1h)).

Creating the AWS IAM Role with accompanied trust relationship to Boiling AWS Account can be a bit tricky task as we also have added IAM Policy conditions to improve the security furthermore. But don't worry, `bdcli` can be used to create the IAM Role with the help of your Boiling account access.

First, you create a YAML file that describes the S3 Bucket (and optionally a Prefix if you want to restrict access to prefix) for Boiling access. `bdcli` will use this YAML file to create the IAM Role for you. You can then review the IAM Role if you like. Once you're happy with it, you can configure IAM Role arn (arn is like a URL) to your Boiling Account. This way, Boiling knows which IAM Role to assume (credentials to vend) and use when accessing data for your queries.

Here is a minimal YAML configuration example that grants Boiling read access on `s3://YOURBUCKET/YOURPREFIX*`. See [example_datasource_config.yaml](example_datasource_config.yaml) for a more thorough example.

```yaml
dataSources:
  - name: YOURDATASOURCENAME
    accessPolicy:
      - id: your-user-policy
        urlPrefix: s3://YOURBUCKET/YOURPREFIX
```

### Your user's minimal AWS IAM Polify for using Boiling

When you want to use Boiling to read your data on your S3 Bucket, you need these minimal permissions available with the `AWS_PROFILE` in use when you run bdcli.

> You need to replace `YOURBUCKET` and `YOURPREFIX` with the S3 Bucket and Prefix you want to read (and/or write) with Boiling.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "MinimalBoilingS3Policy",
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:ListBucket", "s3:GetBucketLocation"],
      "Resource": ["arn:aws:s3:::YOURBUCKET", "arn:aws:s3:::YOURBUCKET/YOURPREFIX*"],
      "Condition": {
        "StringEquals": {
          "s3:prefix": "YOURPREFIX"
        }
      }
    },
    {
      "Sid": "MinimalBoilingIAMPolicy",
      "Effect": "Allow",
      "Action": ["iam:CreateRole", "iam:TagRole", "iam:ListPolicies"],
      "Resource": "*"
    }
  ]
}
```

### Sharing data sets for others and querying data shared to you

Boiling supports data sharing with row, column, time, and schedule based security. In practice, you share "a database VIEW" for other Boiling user(s).

```shell
duckdb -s "SELECT fromEmail, shareName, lifeTime, schedule FROM boilingdata('SELECT * FROM boilingshares WHERE fromEmail != ''demo@boilingdata.com'' ORDER BY shareName');"
┌────────────────────┬────────────────────────┬──────────┬─────────────┐
│     fromEmail      │       shareName        │ lifeTime │  schedule   │
│      varchar       │        varchar         │ varchar  │   varchar   │
├────────────────────┼────────────────────────┼──────────┼─────────────┤
│ dforsber@gmail.com │ demo_full              │ 1h       │ * * * * * * │
│ dforsber@gmail.com │ taxi_locations         │ 1h       │ * * * * * * │
│ dforsber@gmail.com │ taxi_locations_limited │ 1h       │ * * * * * * │
└────────────────────┴────────────────────────┴──────────┴─────────────┘
```

> When you query data shared to you, Boiling will use the data owners credentials for data access, but limit the access to the VIEW described by SQL statement in the share configuration. This SQL statement is not visible to you as a share consumer, but only visible to the account that shared the data for you. In other words, the access is limited by the AWS IAM Role and furthermore, limited by the SQL statement (VIEW) to achieve row and column based security, but also time based security with the lifeTime and schedule attributes.

Here is an example of `demo@boilingdata.com` users' Boiling data shares.

- Please note that the `schema` column can be used to deduce the shared data set schema for cataloguing purpose. We use this data on [Boiling BI Tool Integrations](https://github.com/boilingdata/boilingdata-http-gw).
- Please note also that the `sql` column is only visible for entries having `fromEmail` equal to your account, i.e. data sets that you have shared for others.

> OBT (One Big Table) design works also quite nicely with Boiling as you can create multiple segmented views over the same data with row and column filters. Behind the scenes Boiling warms up the whole data set and while users access the segments, they will all hit the same warm data set and experience fast query results right away!

````shell
duckdb -s "SELECT * FROM boilingdata('SELECT * FROM boilingshares ORDER BY shareName');"
┌──────────────────────┬──────────────────────┬──────────────────────┬──────────┬─────────────┬──────────────────────┬────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┬─────────────────────────────────────────────────────────────────────────────┐
│      fromEmail       │       toEmail        │       shareId        │ lifeTime │  schedule   │      shareName       │                                                                 schema                                                                 │                                     sql                                     │
│       varchar        │       varchar        │       varchar        │ varchar  │   varchar   │       varchar        │                                                                varchar                                                                 │                                   varchar                                   │
├──────────────────────┼──────────────────────┼──────────────────────┼──────────┼─────────────┼──────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────┤
│ dforsber@gmail.com   │ demo@boilingdata.com │ 5cc9d5546ab3dd45bb…  │ 1h       │ * * * * * * │ demo_full            │ CREATE TABLE t (VendorID INTEGER, tpep_pickup_datetime TIMESTAMP WITH TIME ZONE, tpep_dropoff_datetime TIMESTAMP WITH TIME ZONE, pas…  │                                                                             │
│ demo@boilingdata.com │ dforsber@gmail.com   │ 27cdfa4dcd23c597a8…  │ 1h       │ * * * * * * │ taxi_locations       │ CREATE TABLE t (LocationID BIGINT, Borough VARCHAR, Zone VARCHAR, service_zone VARCHAR);                                               │ SELECT * FROM parquet_scan('s3://boilingdata-demo/taxi_locations.parquet'); │
│ dforsber@gmail.com   │ demo@boilingdata.com │ 2a521dffa65cea9c46…  │ 1h       │ * * * * * * │ taxi_locations       │ CREATE TABLE t (LocationID BIGINT, Borough VARCHAR, Zone VARCHAR, service_zone VARCHAR);                                               │                                                                             │
│ dforsber@gmail.com   │ demo@boilingdata.com │ 030895e27c10645541…  │ 1h       │ * * * * * * │ taxi_locations_lim…  │ CREATE TABLE t (LocationID BIGINT, Borough VARCHAR);                                                                                   │                                                                             │
└──────────────────────┴──────────────────────┴──────────────────────┴──────────┴─────────────┴──────────────────────┴────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┴─────────────────────────────────────────────────────────────────────────────┘

Here is an example for accessing shared data set. Both data set shares point to the same data source, where the `taxi_locations_limited` only allows to see two columns instead of all.

```shell
duckdb -s "SELECT * FROM boilingdata('SELECT * FROM share(''dforsber@gmail.com:taxi_locations'') LIMIT 5');"
┌────────────┬───────────────┬─────────────────────────┬──────────────┐
│ LocationID │    Borough    │          Zone           │ service_zone │
│   int64    │    varchar    │         varchar         │   varchar    │
├────────────┼───────────────┼─────────────────────────┼──────────────┤
│          1 │ EWR           │ Newark Airport          │ EWR          │
│          2 │ Queens        │ Jamaica Bay             │ Boro Zone    │
│          3 │ Bronx         │ Allerton/Pelham Gardens │ Boro Zone    │
│          4 │ Manhattan     │ Alphabet City           │ Yellow Zone  │
│          5 │ Staten Island │ Arden Heights           │ Boro Zone    │
└────────────┴───────────────┴─────────────────────────┴──────────────┘
duckdb -s "SELECT * FROM boilingdata('SELECT * FROM share(''dforsber@gmail.com:taxi_locations_limited'') LIMIT 5');"
┌────────────┬───────────────┐
│ LocationID │    Borough    │
│   int64    │    varchar    │
├────────────┼───────────────┤
│          1 │ EWR           │
│          2 │ Queens        │
│          3 │ Bronx         │
│          4 │ Manhattan     │
│          5 │ Staten Island │
└────────────┴───────────────┘
````
