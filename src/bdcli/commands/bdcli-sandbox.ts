import { Command } from "commander";

const program = new Command("bdcli sandbox")
  .executableDir("sandbox")
  .command("list", "List deployed sandboxes")
  .command("validate", "Validate sandbox template (e.g. for CI)")
  .command("upload", "Upload sandbox template")
  .command("download", "Download the deployed sandbox template")
  .command("plan", "List planned udpates/additions/deletions based on local sandbox definition and deployed sandbox")
  .command("deploy", "Deploy the sandbox")
  .command("destroy", "Destroy the sandbox");

program.parse(process.argv);
