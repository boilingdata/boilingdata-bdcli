import { Command } from "commander";

const program = new Command("bdcli api")
  .executableDir("api")
  .command("wssurl", "Get signed WebSocket (wss://) URL for connecting to Boiling Data")
  .command("query", "Run SQL query on Boiling cloud");

program.parse(process.argv);
