import { Command } from "commander";

const program = new Command("bdcli domain")
  .executableDir("domain")
  .command("setup", "Initiate your BoilingData domain registration (to be implemented)");

program.parse(process.argv);
