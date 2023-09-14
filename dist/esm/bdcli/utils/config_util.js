import * as fs from "fs/promises";
import * as yaml from "js-yaml";
import * as os from "os";
import deepmerge from "deepmerge";
const configFile = `${os.homedir()}/.bdcli.yaml`;
export async function hasValidConfig() {
    try {
        const config = yaml.load(await fs.readFile(configFile, "utf8"));
        if (config["credentials"] && config["credentials"]["email"] && config["credentials"]["password"])
            return true;
        return false;
    }
    catch (err) {
        return false;
    }
}
export async function updateConfig(updates) {
    let config = {};
    try {
        config = yaml.load(await fs.readFile(configFile, "utf8"));
    }
    catch (err) {
        if (err?.code != "ENOENT")
            throw err;
    }
    await fs.writeFile(configFile, yaml.dump(deepmerge(config, updates)), {
        encoding: "utf8",
        flag: "w",
        mode: 0o600,
    });
}
export async function getConfig() {
    return yaml.load(await fs.readFile(configFile, "utf8"));
}
export async function getCredentials(logger) {
    const { credentials } = await getConfig();
    if (!credentials.email || !credentials.password)
        throw new Error("Could not get credentials");
    const resp = { ...credentials, email: credentials.email, password: credentials.password }; // To make TS happy..
    logger?.debug({ ...resp, password: resp?.password ? "**" : undefined });
    return resp;
}
