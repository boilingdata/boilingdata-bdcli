import { Command } from "commander";

const program = new Command("bdcli data-set")
  .executableDir("data-set")
  .command("list", "List data sets")
  .command("create", "Create a data set");

program.parse(process.argv);
