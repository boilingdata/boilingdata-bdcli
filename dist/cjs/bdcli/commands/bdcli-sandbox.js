"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const program = new commander_1.Command("bdcli sandbox")
    .executableDir("sandbox")
    .command("list", "List deployed sandboxes")
    .command("create-role", "Create Sandbox IAM Role with your AWS credentials")
    .command("validate", "Validate *local* sandbox template")
    .command("upload", "Upload sandbox template")
    .command("download", "Download the *uploaded* sandbox template")
    .command("plan", "List planned udpates based on *uploaded* sandbox definition and deployed sandbox")
    .command("deploy", "Deploy the *uploaded* sandbox")
    .command("destroy", "Destroy the sandbox");
program.parse(process.argv);
