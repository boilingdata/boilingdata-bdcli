# What can you do with Boiling Data?

## 1. Query data from S3

You can run SQL queries over your data on S3 in Parquet format. You can use S3 folders, Glue Tables, or just list of files as input in your SQL, like

```sql
SELECT * FROM parquet_scan(ARRAY['s3://buck/file1.parquet','s3://buck/file2.parquet'])
```

Queries will run on the same region where the S3 bucket is located to avoid data egress costs and data throughput issues. Boiling lifts the data from S3 into memory as a whole, during this warming up time, Boiling reads data from S3, decompresses the data and puts it into in-memory database table (DuckDB).

## 2. Share data for others and query data shared to you, cross AWS Accounts

You can share data (SQL VIEWs) for other Boiling users. You can create these data shares with `bdcli`. You can list data shared from/to you with `bdcli`. Then you know if you have been shared some data or not, or if you have shared data for others. You can query data shared to you, like

```sql
SELECT * FROM share('dforsber@gmail.com:taxi_locations');
```

User sharing the data and user consuming the data can be in different organisations and AWS accounts completely.

## 3. Output SQL query results onto S3 (ETL)

You can run SQL queries and output the results into S3.

```sql
CREATE TABLE t WITH (
    FORMAT 'Parquet',
    COMPRESSION 'ZSTD'
) AS SELECT col1, col2 FROM parquet_scan('s3://buck/year=2024/month=01/day=01/');
```

## 4. Connect with Presto compatible BI Tool

You can run [`boilingdata-http-gw`](https://github.com/boilingdata/boilingdata-http-gw) and connect to its port and run queries on Boiling.

## 5. You can connect to Boiling with SDKs and try out with the Demo GUI

- [NodeJS/JS SDK](https://github.com/boilingdata/node-boilingdata) (both Browser and NodeJS)
- [Python SDK](https://github.com/boilingdata/py-boilingdata)

Our [Demo GUI](https://app.boilingdata.com) uses the NodeJS/JS SDK for running queries on Boiling.


## 6. (experimental) You can use DBT and DuckDB itself to run queries on Boiling (cloud side)

Boiling has experimental support for HTTPFS+Parquet interface, which you can use from within DuckDB by creating a `TABLE MACRO` that includes `bdcli` generated authentication token. Through this you can utilise [DBT dbt-duckdb package with Boiling Data plugin]([ttps://github.com/boilingdata/boilingdata-dbt-demo). However, please note that this is slower interface than with SDKs.
