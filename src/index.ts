#!/usr/bin/env node
import * as cmd from "commander";
import { VERSION } from "./VERSION.js";

const program = new cmd.Command("bdcli");

program
  .executableDir("bdcli/commands")
  .version(VERSION)
  .allowExcessArguments(false)
  .command("account", "Setup and configure your BoilingData account")
  .command("aws", "Setup and configure your AWS account integration with BoilingData");

program.parse(process.argv);
