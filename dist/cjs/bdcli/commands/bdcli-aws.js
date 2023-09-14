"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const program = new commander_1.Command("bdcli aws")
    .executableDir("aws")
    .command("iam", "Setup IAM Role into your AWS account for controlled BoilingData access");
program.parse(process.argv);
