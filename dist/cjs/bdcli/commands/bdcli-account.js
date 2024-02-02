"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const program = new commander_1.Command("bdcli account")
    .executableDir("account")
    .command("config", "Create local config holding credentials (and vended session tokens)")
    .command("register", "Register into BoilingData")
    .command("password", "Update (or recover) password")
    .command("mfa", "Enable MFA")
    .command("migrate", "Migrate your account to another AWS region (not-yet-implemented)")
    .command("sts-token", "Exchange Cognito ID Token into shared or your own BoilingData Short-Term-Session (STS) token")
    .command("tap-token", "Exchange Cognito ID Token into shared or your own BoilingData Stream Tap auth token")
    .command("token-share", "Share data sets via access tokens to other Boiling users")
    .command("token-unshare", "Unshare access tokens")
    .command("token-list-shares", "List shared data sets (access tokens) from and to you")
    .command("token-list-sessions", "List sessions (vended access tokens) in local cache");
program.parse(process.argv);
