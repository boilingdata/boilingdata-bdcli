# What can you do with Boiling Data?

## 1. Query data from S3

If you have your own S3 data, you define access to it and grant it for Boiling through IAM Roles (best practice security within AWS cloud). If you don't have an AWS account, you can query data shared to you with your Boiling account (see below).

You can run SQL queries over your data on S3 in Parquet format. You can use S3 folders, Glue Tables, or just list of files as input in your SQL.

```sql
SELECT * FROM parquet_scan(ARRAY['s3://buck/file1.parquet','s3://buck/file2.parquet'])
```

Every query runs in AWS Lambda functions that have maximum capacity and run only your query. You directly benefit from the AWS Lambda scale capacity. This way, if you have lots of datasets and you run queries against them, there is no noisy neighbour situation.

> **NOTE**: Queries will run on the same region where the S3 bucket is located to avoid data egress costs and data throughput issues. Boiling lifts the data from S3 into memory as a whole, during this warming up time, Boiling reads data from S3, decompresses the data and puts it into in-memory database table (DuckDB). For now this is a deliberate decision so that next queries, even if they refer to columns not queried before the data would be in the memory already.

> **NOTE**: Boiling Data is a distributed SQL engine running in AWS Lambda functions on top of S3 Data. We have 100% support for e.g. TCP-H kind of queries. When Boiling reads data from S3, it splits the data into even chunks and then loads into AWS Lambda memory. This way, for example search/filter queries are very fast because there are tens/hundreds of CPU cores filtering the data in the CPU memory at the same time. On the other hand distributed queries, like heavy JOINs and aggregations requiring full scans over the whole column are slower due to the distributed manner compared to scenario where you have all the data in a single big instance. For this reason, we are planning to add support for adding your own `workers` that will join Boiling Data fabric. This way you can have single big instance experience and speed with queries that are not easily/naturally distributable. Boiling will take care of the query routing.

## 2. Share data for others and query data shared to you, across AWS Accounts

You can share data (SQL VIEWs) for other Boiling users. You can create these data shares with `bdcli`. You can list data shared from/to you with `bdcli`. Then you know if you have been shared some data or not, or if you have shared data for others. You can query data shared to you, like

```sql
SELECT * FROM share('dforsber@gmail.com:taxi_locations');
```

User sharing the data and user consuming the data can be in different organisations and AWS accounts completely.

> **NOTE**: One Big Table (OBT) design is quite natural when accompanied with user specific shares. This way the whole data set is kept in memory when queried, but each of the shares only sees data visible through the SQL VIEW. This way you have row and column based security on top of S3. Boiling improves the security furthermore by allowing you to have cron like expression on when the share is accessible and how long at a time (e.g. during the week from 10am to 2pm).

## 3. Output SQL query results onto S3 (ETL)

You can run SQL queries and output the results into S3.

> **NOTE**: If you need to download lots of data to e.g. browser, this is the best way of doing it. First, Boiling will create the data set for you into Parquet format that is about 5x compressed data and thus much faster to download. Secondly, you can use Boiling to further query these results if you like, or e.g. query them directly with DuckDB WASM in your Browser from your S3 Bucket.

```sql
CREATE TABLE t WITH (
    FORMAT 'Parquet',
    COMPRESSION 'ZSTD',
    EXTERNAL_LOCATION 's3://boilingdata-demo/upload/out.parquet'
) AS SELECT col1, col2 FROM parquet_scan('s3://buck/year=2024/month=01/day=01/');
```

## 4. Connect with Presto compatible BI Tool

You can run [`boilingdata-http-gw`](https://github.com/boilingdata/boilingdata-http-gw) and connect to its port and run queries on Boiling.

## 5. You can connect to Boiling with SDKs and try out with the Demo GUI

- [NodeJS/JS SDK](https://github.com/boilingdata/node-boilingdata) (both Browser and NodeJS)
- [Python SDK](https://github.com/boilingdata/py-boilingdata)

Our [Demo GUI](https://app.boilingdata.com) uses the NodeJS/JS SDK for running queries on Boiling.

> **NOTE**: The Demo queries only work if you have not changed the IAM Role with your own. When you register to Boiling, you will have demo IAM Role attached which has access to `s3://boilingdata-demo/` S3 Bucket. Once you create your own IAM Role with `bdcli` and your YAML file, the resulting IAM Role has access to data that you have specified and not to the Boiling demo data anymore.

## 6. (experimental) You can use DBT and DuckDB itself to run queries on Boiling (cloud side)

Boiling has experimental support for HTTPFS+Parquet interface, which you can use from within DuckDB by creating a `TABLE MACRO` that includes `bdcli` generated authentication token. Through this you can utilise [DBT dbt-duckdb package with Boiling Data plugin]([ttps://github.com/boilingdata/boilingdata-dbt-demo). However, please note that this is slower interface than with SDKs.
