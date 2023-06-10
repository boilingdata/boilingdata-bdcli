import { Command } from "commander";

const program = new Command("bdcli setup")
  .executableDir("setup")
  .command("account", "Register user account to BoilingData")
  .command("iam-role", "AWS IAM Role setup");

program.parse(process.argv);
