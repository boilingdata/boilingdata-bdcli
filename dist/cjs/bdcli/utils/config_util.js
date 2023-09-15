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
exports.getConfigCredentials = exports.combineOptsWithSettings = exports.getConfigSettings = exports.getConfig = exports.setProfile = exports.updateConfig = exports.listConfigProfiles = exports.hasValidConfig = exports.profile = exports.BDCONF = void 0;
const fs = __importStar(require("fs/promises"));
const yaml = __importStar(require("js-yaml"));
const os = __importStar(require("os"));
const deepmerge_1 = __importDefault(require("deepmerge"));
const auth_util_js_1 = require("./auth_util.js");
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
    const configFileData = await fs.readFile(configFile, "utf8");
    const config = yaml.load(configFileData, { filename: configFile });
    if (config.credentials && exports.profile === "default")
        return config; // no profiles
    logger?.debug({ profile: exports.profile, keys: Object.keys(config) });
    if (Object.keys(config).includes(exports.profile)) {
        return Object.values(config).at(Object.keys(config).indexOf(exports.profile));
    }
    return;
}
exports.getConfig = getConfig;
async function getConfigSettings(logger) {
    const conf = await getConfig();
    const settings = conf?.settings ?? {};
    logger?.debug({ settings });
    return settings;
}
exports.getConfigSettings = getConfigSettings;
async function combineOptsWithSettings(opts, logger) {
    return (0, deepmerge_1.default)(await getConfigSettings(logger), opts);
}
exports.combineOptsWithSettings = combineOptsWithSettings;
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
