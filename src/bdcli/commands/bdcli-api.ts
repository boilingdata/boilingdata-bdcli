import { Command } from "commander";

const program = new Command("bdcli api")
  .executableDir("api")
  .command("wssurl", "Get signed WebSocket (wss://) URL for connecting to Boiling Data");

program.parse(process.argv);
