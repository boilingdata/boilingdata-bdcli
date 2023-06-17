import * as fs from "fs";
const version = JSON.parse(fs.readFileSync("package.json").toString("utf-8")).version;
fs.writeFileSync("src/VERSION.ts", `export const VERSION="${version}";\n`);
