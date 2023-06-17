#!/usr/bin/env node
import * as cmd from "commander";
import { VERSION } from "./VERSION.js";

const program = new cmd.Command("bdcli");

program
  .executableDir("bdcli/commands")
  .version(VERSION)
  .allowExcessArguments(false)
  .command("setup", "Setup configuration")
  .command("data-source", "Manage data sources");

program.parse(process.argv);
