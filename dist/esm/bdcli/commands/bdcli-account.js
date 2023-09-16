import { Command } from "commander";
const program = new Command("bdcli account")
    .executableDir("account")
    .command("config", "Create local config holding credentials (and later on tokens)")
    .command("register", "Register into BoilingData")
    .command("password", "Update (or recover) password")
    .command("migrate", "Migrate your account to another AWS region (not-yet-implemented)")
    .command("sts-token", "Exchange Cognito ID Token into BoilingData (short term session) token")
    .command("token-share", "Share specific access tokens with other Boiling users")
    .command("token-unshare", "Unshare access tokens for other Boiling users")
    .command("token-list-shares", "List shared data accesses (tokens) from/to you")
    .command("token-list-sessions", "List sessions (vended shared access tokens) in local cache")
    .command("mfa", "Enable MFA");
program.parse(process.argv);
