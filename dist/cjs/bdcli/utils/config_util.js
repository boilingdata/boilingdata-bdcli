"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConfigCredentials = exports.getCachedTokenSessions = exports.serialiseTokensList = exports.combineOptsWithSettings = exports.applyGlobalConfigHooks = exports.getEnvSettings = exports.getConfigSettings = exports.getConfig = exports.setProfile = exports.updateConfig = exports.listConfigProfiles = exports.hasValidConfig = exports.profile = exports.BDCONF = void 0;
const fs = __importStar(require("fs/promises"));
const yaml = __importStar(require("js-yaml"));
const os = __importStar(require("os"));
const deepmerge_1 = __importDefault(require("deepmerge"));
const logger_util_js_1 = require("./logger_util.js");
const auth_util_js_1 = require("./auth_util.js");
const jwt = __importStar(require("jsonwebtoken"));
const spinner_util_js_1 = require("./spinner_util.js");
exports.BDCONF = "~/.bdcli.yaml";
const configFile = `${os.homedir()}/.bdcli.yaml`;
exports.profile = "default";
let currentCreds;
async function hasValidConfig(logger) {
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
exports.hasValidConfig = hasValidConfig;
async function listConfigProfiles(logger) {
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
exports.listConfigProfiles = listConfigProfiles;
async function updateConfig(updates, logger) {
    let config = {};
    try {
        config = yaml.load(await fs.readFile(configFile, "utf8"));
    }
    catch (err) {
        if (err?.code != "ENOENT")
            throw err;
    }
    let contents = yaml.dump((0, deepmerge_1.default)(config, updates));
    if (config["credentials"]) {
        logger?.debug({ status: "Updating config file to use profiles" });
        contents = yaml.dump((0, deepmerge_1.default)({ default: config }, { [exports.profile]: { ...(await getConfig()), ...updates } }));
    }
    else {
        //if (!Object.keys(config).includes(profile)) throw new Error(`Profile "${profile}" does not exist`);
        contents = yaml.dump((0, deepmerge_1.default)(config, { [exports.profile]: { ...(await getConfig()), ...updates } }));
    }
    await fs.writeFile(configFile, contents, {
        encoding: "utf8",
        flag: "w",
        mode: 0o600,
    });
}
exports.updateConfig = updateConfig;
function setProfile(profileName, logger) {
    exports.profile = profileName;
    logger?.debug({ profile: exports.profile });
}
exports.setProfile = setProfile;
async function getConfig(logger) {
    try {
        const configFileData = await fs.readFile(configFile, "utf8");
        const config = yaml.load(configFileData, { filename: configFile });
        if (config.credentials && exports.profile === "default")
            return config; // no profiles
        logger?.debug({ profile: exports.profile, keys: Object.keys(config) });
        if (!Object.keys(config).includes(exports.profile))
            return;
        return Object.values(config).at(Object.keys(config).indexOf(exports.profile));
    }
    catch (err) {
        logger?.debug({ err });
    }
    return;
}
exports.getConfig = getConfig;
async function getConfigSettings(logger) {
    const conf = await getConfig(logger);
    const settings = conf?.settings ?? {};
    logger?.debug({ settings });
    return settings;
}
exports.getConfigSettings = getConfigSettings;
function camalize(str) {
    return str.toLowerCase().replace(/[^a-zA-Z0-9]+(.)/g, (_m, chr) => chr.toUpperCase());
}
function getEnvSettings(logger) {
    const _bdEnvs = Object.entries(process.env)
        .filter(e => e[0].startsWith("BD_") && e[0].length > 3 && e.length >= 1 && e[1] && e[1].length > 0)
        .map(e => [camalize(e[0].substring(3).toLowerCase()), e[1]]);
    const bdEnvs = _bdEnvs.map(e => ({ [`${e[0]}`]: e[1] })).reduce((prev, curr) => ({ ...prev, ...curr }), {});
    logger?.debug({ bdEnvs });
    return bdEnvs;
}
exports.getEnvSettings = getEnvSettings;
function applyGlobalConfigHooks(opts, logger) {
    // global opts handling due to the Commander short comings
    if (opts["profile"])
        setProfile(opts["profile"]);
    if (opts["logLevel"])
        logger.setLogLevel(opts["level"]);
    if (opts["debug"])
        logger.setLogLevel(logger_util_js_1.ELogLevel.DEBUG);
    if (opts["disableSpinner"])
        (0, spinner_util_js_1.disableSpinner)();
}
exports.applyGlobalConfigHooks = applyGlobalConfigHooks;
async function combineOptsWithSettings(opts, logger) {
    const envSettings = getEnvSettings(logger);
    // we get e.g. BD_PROFILE, so we can get settings
    applyGlobalConfigHooks(envSettings, logger);
    const options = (0, deepmerge_1.default)({ ...(await getConfigSettings(logger)), ...envSettings }, opts);
    // then we also re-apply as we get possibly settings from the configuration file for the profile
    applyGlobalConfigHooks(options, logger);
    logger?.debug({ options: { ...options, password: options["password"] ? "**" : undefined } });
    return options;
}
exports.combineOptsWithSettings = combineOptsWithSettings;
function serialiseTokensList(sharedTokens) {
    return sharedTokens.map(entry => `${entry.shareId}:${entry.bdStsToken}`);
}
exports.serialiseTokensList = serialiseTokensList;
async function getCachedTokenSessions(logger, showExpired = false) {
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
exports.getCachedTokenSessions = getCachedTokenSessions;
async function getConfigCredentials(logger) {
    if (currentCreds)
        return currentCreds; // cached in mem, so you can call this method multiple times
    const conf = await getConfig();
    if (!conf)
        throw new Error(`No config for profile "${exports.profile}"`);
    logger?.debug({ conf });
    const { credentials } = conf;
    if (!credentials.email)
        throw new Error("Could not get credentials (email)");
    credentials.password = credentials.password ?? (await (0, auth_util_js_1.getPw)("Please enter password"));
    if (!credentials.password)
        throw new Error("Could not get credentials (password)");
    currentCreds = { ...credentials, email: credentials.email, password: credentials.password }; // To make TS happy..
    logger?.debug({ ...currentCreds, password: currentCreds?.password ? "**" : undefined });
    return currentCreds;
}
exports.getConfigCredentials = getConfigCredentials;
