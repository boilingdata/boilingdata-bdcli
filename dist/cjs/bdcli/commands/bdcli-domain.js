"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const program = new commander_1.Command("bdcli domain")
    .executableDir("domain")
    .command("setup", "Initiate your BoilingData domain registration (to be implemented)");
program.parse(process.argv);
