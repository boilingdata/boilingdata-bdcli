#!/usr/bin/env node
import * as cmd from "commander";
import { VERSION } from "./VERSION.js";
const program = new cmd.Command("bdcli");
program
    .executableDir("bdcli/commands")
    .version(VERSION)
    .allowExcessArguments(false)
    .command("account", "Setup and configure your BoilingData account")
    .command("aws", "Setup and configure your AWS account integration with BoilingData")
    .command("domain", "Admin setup and configuration for your domain (.e.g @boilingdata.com, @mycompany.com)")
    .command("sandbox", "Managa Boiling S3 Sandboxes with IaC templates");
program.parse(process.argv);
