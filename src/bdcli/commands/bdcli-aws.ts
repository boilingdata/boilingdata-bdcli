import { Command } from "commander";

const program = new Command("bdcli aws")
  .executableDir("aws")
  .command("s3-iam", "Setup IAM Role into your AWS account for accessing S3")
  .command("taps-iam", "Setup deployer and service IAM Roles into your AWS account for creating and running Data Taps")
  .command("lambda-layers", "Maintain BoilingData AWS Lambda Layer for your Lambda functions");

program.parse(process.argv);
