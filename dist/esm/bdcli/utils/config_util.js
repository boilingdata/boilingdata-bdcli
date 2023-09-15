import * as fs from "fs/promises";
import * as yaml from "js-yaml";
import * as os from "os";
import deepmerge from "deepmerge";
import { getPw } from "./auth_util.js";
export const BDCONF = "~/.bdcli.yaml";
const configFile = `${os.homedir()}/.bdcli.yaml`;
export let profile = "default";
let currentCreds;
export async function hasValidConfig(logger) {
    try {
        const config = await getConfig(logger);
        logger?.debug({ hasValidConfig: config });
        if (!config)
            return false;
        if (config["credentials"] && config["credentials"]["email"])
            return true;
        return false;
    }
    catch (err) {
        return false;
    }
}
export async function listConfigProfiles(logger) {
    try {
        const config = yaml.load(await fs.readFile(configFile, "utf8"));
        if (config.credentials)
            return ["default"];
        return Object.keys(config);
    }
    catch (err) {
        logger?.debug({ err });
        throw err;
    }
}
export async function updateConfig(updates, logger) {
    let config = {};
    try {
        config = yaml.load(await fs.readFile(configFile, "utf8"));
    }
    catch (err) {
        if (err?.code != "ENOENT")
            throw err;
    }
    let contents = yaml.dump(deepmerge(config, updates));
    if (config["credentials"]) {
        logger?.debug({ status: "Updating config file to use profiles" });
        contents = yaml.dump(deepmerge({ default: config }, { [profile]: { ...(await getConfig()), ...updates } }));
    }
    else {
        contents = yaml.dump(deepmerge(config, { [profile]: { ...(await getConfig()), ...updates } }));
    }
    await fs.writeFile(configFile, contents, {
        encoding: "utf8",
        flag: "w",
        mode: 0o600,
    });
}
export function setProfile(profileName, logger) {
    profile = profileName;
    logger?.debug({ profile });
}
export async function getConfig(logger) {
    const configFileData = await fs.readFile(configFile, "utf8");
    const config = yaml.load(configFileData, { filename: configFile });
    if (config.credentials && profile === "default")
        return config; // no profiles
    logger?.debug({ profile, keys: Object.keys(config) });
    if (Object.keys(config).includes(profile)) {
        return Object.values(config).at(Object.keys(config).indexOf(profile));
    }
    return;
}
export async function getConfigSettings(logger) {
    const conf = await getConfig();
    const settings = conf?.settings ?? {};
    logger?.debug({ settings });
    return settings;
}
export async function combineOptsWithSettings(opts, logger) {
    return deepmerge(await getConfigSettings(logger), opts);
}
export async function getConfigCredentials(logger) {
    if (currentCreds)
        return currentCreds; // cached in mem, so you can call this method multiple times
    const conf = await getConfig();
    if (!conf)
        throw new Error(`No config for profile "${profile}"`);
    logger?.debug({ conf });
    const { credentials } = conf;
    if (!credentials.email)
        throw new Error("Could not get credentials (email)");
    credentials.password = credentials.password ?? (await getPw("Please enter password"));
    if (!credentials.password)
        throw new Error("Could not get credentials (password)");
    currentCreds = { ...credentials, email: credentials.email, password: credentials.password }; // To make TS happy..
    logger?.debug({ ...currentCreds, password: currentCreds?.password ? "**" : undefined });
    return currentCreds;
}
