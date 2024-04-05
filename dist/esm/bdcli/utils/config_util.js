import * as fs from "fs/promises";
import * as yaml from "js-yaml";
import * as os from "os";
import deepmerge from "deepmerge";
import { ELogLevel } from "./logger_util.js";
import { getPw } from "./auth_util.js";
import * as jwt from "jsonwebtoken";
import { disableSpinner } from "./spinner_util.js";
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
export async function dumpConfigProfile(profile, logger) {
    logger?.debug({ profile });
    const config = yaml.load(await fs.readFile(configFile, "utf8"));
    const dump = config?.credentials ? config : config?.[profile != "true" ? profile : "default"];
    if (!dump)
        return;
    return dump;
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
        //if (!Object.keys(config).includes(profile)) throw new Error(`Profile "${profile}" does not exist`);
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
    try {
        const configFileData = await fs.readFile(configFile, "utf8");
        const config = yaml.load(configFileData, { filename: configFile });
        if (config.credentials && profile === "default")
            return config; // no profiles
        logger?.debug({ profile, keys: Object.keys(config) });
        if (!Object.keys(config).includes(profile))
            return;
        return Object.values(config).at(Object.keys(config).indexOf(profile));
    }
    catch (err) {
        logger?.debug({ err });
    }
    return;
}
export async function getConfigSettings(logger) {
    const conf = await getConfig(logger);
    const settings = conf?.settings ?? {};
    logger?.debug({ settings });
    return settings;
}
function camalize(str) {
    return str.toLowerCase().replace(/[^a-zA-Z0-9]+(.)/g, (_m, chr) => chr.toUpperCase());
}
export function getEnvSettings(logger) {
    const _bdEnvs = Object.entries(process.env)
        .filter(e => e[0].startsWith("BD_") && e[0].length > 3 && e.length >= 1 && e[1] && e[1].length > 0)
        .map(e => [camalize(e[0].substring(3).toLowerCase()), e[1]]);
    const bdEnvs = _bdEnvs.map(e => ({ [`${e[0]}`]: e[1] })).reduce((prev, curr) => ({ ...prev, ...curr }), {});
    logger?.debug({ bdEnvs });
    return bdEnvs;
}
export function applyGlobalConfigHooks(opts, logger) {
    // global opts handling due to the Commander short comings
    if (opts["profile"])
        setProfile(opts["profile"]);
    if (opts["logLevel"])
        logger.setLogLevel(opts["level"]);
    if (opts["debug"])
        logger.setLogLevel(ELogLevel.DEBUG);
    if (opts["disableSpinner"])
        disableSpinner();
}
export async function combineOptsWithSettings(opts, logger) {
    const envSettings = getEnvSettings(logger);
    // we get e.g. BD_PROFILE, so we can get settings
    applyGlobalConfigHooks(envSettings, logger);
    const options = deepmerge({ ...(await getConfigSettings(logger)), ...envSettings }, opts);
    // then we also re-apply as we get possibly settings from the configuration file for the profile
    applyGlobalConfigHooks(options, logger);
    logger?.debug({ options: { ...options, password: options["password"] ? "**" : undefined } });
    return options;
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
