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
exports.getCredentials = exports.getConfig = exports.updateConfig = exports.hasValidConfig = void 0;
const fs = __importStar(require("fs/promises"));
const yaml = __importStar(require("js-yaml"));
const os = __importStar(require("os"));
const deepmerge_1 = __importDefault(require("deepmerge"));
const configFile = `${os.homedir()}/.bdcli.yaml`;
async function hasValidConfig() {
    try {
        if (!fs.statfs)
            throw new Error("Please use more recent node version that supports fs.statfs()");
        await fs.statfs(configFile);
        const config = yaml.load(await fs.readFile(configFile, "utf8"));
        if (config["credentials"] && config["credentials"]["email"] && config["credentials"]["password"])
            return true;
        return false;
    }
    catch (err) {
        return false;
    }
}
exports.hasValidConfig = hasValidConfig;
async function updateConfig(updates) {
    let config = {};
    try {
        await fs.statfs(configFile);
        config = yaml.load(await fs.readFile(configFile, "utf8"));
    }
    catch (err) {
        if (err?.code != "ENOENT")
            throw err;
    }
    await fs.writeFile(configFile, yaml.dump((0, deepmerge_1.default)(config, updates)), {
        encoding: "utf8",
        flag: "w",
        mode: 0o600,
    });
}
exports.updateConfig = updateConfig;
async function getConfig() {
    return yaml.load(await fs.readFile(configFile, "utf8"));
}
exports.getConfig = getConfig;
async function getCredentials(logger) {
    const { credentials } = await getConfig();
    if (!credentials.email || !credentials.password)
        throw new Error("Could not get credentials");
    const resp = { ...credentials, email: credentials.email, password: credentials.password }; // To make TS happy..
    logger?.debug({ ...resp, password: resp?.password ? "**" : undefined });
    return resp;
}
exports.getCredentials = getCredentials;
