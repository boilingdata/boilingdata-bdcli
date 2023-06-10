#!/usr/bin/env node
import * as cmd from "commander";
import { version } from "./VERSION.js"; // yarn prebuild

const program = new cmd.Command("bdcli");

program
  .executableDir("bdcli/commands")
  .version(version)
  .allowExcessArguments(false)
  .command("setup", "Setup configuration")
  .command("data-source", "Manage data sources");

program.parse(process.argv);
