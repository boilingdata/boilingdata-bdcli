"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const program = new commander_1.Command("bdcli account")
    .executableDir("account")
    .command("config", "Create local config holding credentials (and later on tokens)")
    .command("register", "Register into BoilingData")
    .command("password", "Update (or recover) password")
    .command("migrate", "Migrate your account to another AWS region (not-yet-implemented)")
    .command("sts-token", "Exchange Cognito ID Token into BoilingData STS token")
    .command("mfa", "Enable MFA");
program.parse(process.argv);
