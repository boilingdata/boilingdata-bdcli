import * as cmd from "commander";
import { version } from "./VERSION"; // yarn prebuild

const program = new cmd.Command("bdcli");

program
  .executableDir("bdcli")
  .option("-d, --debug", "more logging", false)
  .option("-v, --version", "show version")
  .version(version)
  .allowExcessArguments(false)
  .command("data-set", "Manage data sets")
  .command("data-source", "Manage data sources");

program.parse(process.argv);
