# B2C: Configuring Users

As a business providing data applications for your users, you would like to:

1. Enroll the user to BoilingData with `email` and `password`
2. Setup user specific sandbox into AWS S3, like a user specific prefix on an existing S3 Bucket.

## 1. Enroll user to BoilingData

Creating a new BoilingData user can happen either:

- online: https://app.boilingdata.com/
- or by using this `BDCLI` command line tool

Here we just use the BDCLI and add new user profile into `~/.bdcli.yml`. You can also list the configured user profiles.

```shell
bdcli account config --profile userx
bdcli account config --list
```

Once you're happy with the profile, use it to register. First call will create the new user and send verification code to the respective email address. The second call will submit that email confirmation code and thus verify correctness of the email address and allow further usage on Boiling.

```shell
# Register user
bdcli account register --profile userx
# Verify email
bdcli account register --profile userx --confirm 123456
```

Please note that currently the provided email address need to be verified, meaning that the one-time code deliviered to the provided email address needs to be fed back during the registration.

We can test the new account by generating short term session token into DuckDB's configuration file in the home directory and use DuckDB to query BoilingData demo data.

> NOTE! By default Boiling has a demo IAM Role attached to new users so that they get immediate access to the `boilingdata-demo` S3 Bucket, which is on BoilingData's AWS Account.

```shell
# Generate BoilingData macro into DuckDB ~/.duckdbrc file
bdcli account sts-token --profile userx --duckdbrc
duckdb
# Use the BDCLI generated boilingdata() function to pass SQL query to Boiling
D SELECT * FROM boilingdata('SELECT id, first_name FROM parquet_scan(''s3://boilingdata-demo/test.parquet'') LIMIT 2');
┌───────┬────────────┐
│  id   │ first_name │
│ int32 │  varchar   │
├───────┼────────────┤
│     1 │ Amanda     │
│     2 │ Albert     │
└───────┴────────────┘
```

## 2. Setup user specific sandbox

As an example, create `boilingdata_user_x.yaml` file similar to this, where you replace `x` with the user and have correct S3 Bucket and Prefix in place.

```yaml
dataSources:
  - name: demo
    type: s3
    accessPolicy:
      - id: user-x-policy
        urlPrefix: s3://users-bucket/users/x/
        permissions:
          - read
          - write
```

Create the needed IAM Role for the user.

- **NOTE: This step uses the AWS Credentials available on terminal to create the IAM Role into your AWS Account, not BoilingData.**. This way the access to your S3 Bucket is also fully in your control.
- Note that we use `--create-role-only` switch so that we can review the created IAM Role before we configure it into BoilingData. Please note that the two lines after the command are its output.

```shell
bdcli aws iam --profile userx -c boilingdata_user_x.yaml --region eu-west-1 --create-role-only
✔ Authenticating: cached
✔ Creating IAM Role: arn:aws:iam::123456789012:role/boilingdata/bd-ew1-demo-deadbeef0000000
```

Once the IAM Role has been reviewed, we remove the `--create-role-only` switch and run the command again. Again that the 3 lines after the command are example output.

```shell
bdcli aws iam --profile userx -c boilingdata_user_x.yaml --region eu-west-1
✔ Authenticating: cached
✔ Creating IAM Role: arn:aws:iam::123456789012:role/boilingdata/bd-ew1-demo-deadbeef0000000
✔ Registering IAM Role: arn:aws:iam::123456789012:role/boilingdata/bd-ew1-demo-deadbeef0000000
```

## 3. Test the account

Provided that you have the needed access to S3, you can copy [test.parquet](test.parquet) into the configured S3 Bucket and Prefix and then run query on Boiling with the user's credentials.

```shell
aws s3 cp test.parquet s3://users-bucket/users/x/test.parquet
```

- **NOTE!** Please note that the direct DuckDB HTTPFS+Paruqet interface is experimental. Recommended integration is via [node-boilingdata NodeJS/JS SDK](https://github.com/boilingdata/node-boilingdata) or [BoilingData HTTP Gateway](https://github.com/boilingdata/boilingdata-http-gw).

```shell
# Generate BoilingData macro into DuckDB ~/.duckdbrc file
bdcli account sts-token --profile userx --duckdbrc
duckdb
# Use the BDCLI generated boilingdata() function to pass SQL query to Boiling
D SELECT * FROM boilingdata('SELECT id, first_name FROM parquet_scan(''s3://users-bucket/users/x/test.parquet'') LIMIT 2');
┌───────┬────────────┐
│  id   │ first_name │
│ int32 │  varchar   │
├───────┼────────────┤
│     1 │ Amanda     │
│     2 │ Albert     │
└───────┴────────────┘
```
