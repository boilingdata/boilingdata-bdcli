import { Command } from "commander";

const program = new Command("bdcli data-source")
  .executableDir("data-source")
  .command("list", "List data sources")
  .command("create", "Create a data source");

program.parse(process.argv);
