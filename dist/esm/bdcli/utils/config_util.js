import * as fs from "fs/promises";
import * as yaml from "js-yaml";
import * as os from "os";
import deepmerge from "deepmerge";
import { getPw } from "./auth_util.js";
import * as jwt from "jsonwebtoken";
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
        if (!Object.keys(config).includes(profile))
            throw new Error(`Profile "${profile}" does not exist`);
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
export function serialiseTokensList(sharedTokens) {
    return sharedTokens.map(entry => `${entry.shareId}:${entry.bdStsToken}`);
}
export async function getCachedTokenSessions(logger, showExpired = false) {
    const conf = await getConfig();
    const decodedList = (conf?.credentials?.sharedTokens ?? [])
        .concat(conf?.credentials?.bdStsToken ?? [])
        ?.map(token => {
        let shareId = "NA";
        let bdStsToken = token;
        if (token.includes(":")) {
            [shareId, bdStsToken] = token.split(":");
        }
        if (!bdStsToken)
            throw new Error("Could not parse token");
        const bdStsTokenPayload = jwt.decode(bdStsToken, { json: true });
        if (!bdStsTokenPayload)
            throw new Error("Could not parse JWT token payload");
        const minsRemaining = bdStsTokenPayload?.exp
            ? Math.floor((new Date(bdStsTokenPayload?.exp * 1000).getTime() - Date.now()) / (60 * 1000))
            : -1;
        logger?.debug({ minsRemaining, bdStsTokenPayload });
        const status = minsRemaining <= 0 ? "EXPIRED" : "VALID";
        if (!showExpired && status == "EXPIRED")
            return;
        return { shareId, bdStsToken, minsRemaining, status, bdStsTokenPayload };
    })
        .filter(e => !!e);
    return decodedList ?? [];
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
