"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const program = new commander_1.Command("bdcli aws")
    .executableDir("aws")
    .command("s3-iam", "Setup IAM Role into your AWS account for accessing S3")
    .command("taps-iam", "Setup deployer and service IAM Roles into your AWS account for creating and running Data Taps");
program.parse(process.argv);
