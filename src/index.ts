#!/usr/bin/env node
import * as cmd from "commander";
import { version } from "./VERSION.js"; // yarn prebuild

const program = new cmd.Command("bdcli");

program
  .executableDir("bdcli")
  .version(version)
  .allowExcessArguments(false)
  .command("data-set", "Manage data sets")
  .command("data-source", "Manage data sources");

program.parse(process.argv);
