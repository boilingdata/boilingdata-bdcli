"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const program = new commander_1.Command("bdcli api")
    .executableDir("api")
    .command("wssurl", "Get signed WebSocket (wss://) URL for connecting to Boiling Data");
program.parse(process.argv);
