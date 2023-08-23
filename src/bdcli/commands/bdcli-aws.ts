import { Command } from "commander";

const program = new Command("bdcli aws")
  .executableDir("aws")
  .command("iam", "Setup IAM Role into your AWS account for controlled BoilingData access");

program.parse(process.argv);
