import * as fs from "fs/promises";
import * as yaml from "js-yaml";
import * as os from "os";
import deepmerge from "deepmerge";
import { ILogger } from "./logger_util.js";
import { getPw } from "./auth_util.js";

export const BDCONF = "~/.bdcli.yaml";
const configFile = `${os.homedir()}/.bdcli.yaml`;
export let profile = "default";
let currentCreds: any;

export interface ICredentials {
  email?: string;
  password?: string;
  idToken?: string;
  accessToken?: string;
  refreshToken?: string;
  bdStsToken?: string;
  region?: string;
  mfa?: boolean;
  environment?: string;
}

export interface IConfigProfiles {
  [profile: string]: IConfig;
}

export interface IConfig {
  settings?: { [key: string]: string };
  credentials: ICredentials;
}

export async function hasValidConfig(logger?: ILogger): Promise<boolean> {
  try {
    const config = await getConfig(logger);
    logger?.debug({ hasValidConfig: config });
    if (!config) return false;
    if (config["credentials"] && config["credentials"]["email"]) return true;
    return false;
  } catch (err: any) {
    return false;
  }
}

export async function listConfigProfiles(logger?: ILogger): Promise<string[]> {
  try {
    const config = <any>yaml.load(await fs.readFile(configFile, "utf8"));
    if (config.credentials) return ["default"];
    return Object.keys(config);
  } catch (err: any) {
    logger?.debug({ err });
    throw err;
  }
}

export async function updateConfig(updates: IConfig, logger?: ILogger): Promise<void> {
  let config: any = {};
  try {
    config = <object>yaml.load(await fs.readFile(configFile, "utf8"));
  } catch (err: any) {
    if (err?.code != "ENOENT") throw err;
  }
  let contents = yaml.dump(deepmerge(config, updates));
  if (config["credentials"]) {
    logger?.debug({ status: "Updating config file to use profiles" });
    contents = yaml.dump(deepmerge({ default: config }, { [profile]: { ...(await getConfig()), ...updates } }));
  } else {
    contents = yaml.dump(deepmerge(config, { [profile]: { ...(await getConfig()), ...updates } }));
  }
  await fs.writeFile(configFile, contents, {
    encoding: "utf8",
    flag: "w",
    mode: 0o600,
  });
}

export function setProfile(profileName: string, logger?: ILogger): void {
  profile = profileName;
  logger?.debug({ profile });
}

export async function getConfig(logger?: ILogger): Promise<IConfig | undefined> {
  const configFileData = await fs.readFile(configFile, "utf8");
  const config = <IConfig | IConfigProfiles>yaml.load(configFileData, { filename: configFile });
  if (config.credentials && profile === "default") return <IConfig>config; // no profiles
  logger?.debug({ profile, keys: Object.keys(config) });
  if (Object.keys(config).includes(profile)) {
    return Object.values(config).at(Object.keys(config).indexOf(profile));
  }
  return;
}

export async function getConfigSettings(logger?: ILogger): Promise<{ [key: string]: string }> {
  const conf = await getConfig();
  const settings = conf?.settings ?? {};
  logger?.debug({ settings });
  return settings;
}

export async function combineOptsWithSettings(opts: any, logger?: ILogger): Promise<{ [key: string]: string }> {
  return deepmerge(await getConfigSettings(logger), opts);
}

export async function getConfigCredentials(
  logger?: ILogger,
): Promise<ICredentials & Required<Pick<ICredentials, "email" | "password">>> {
  if (currentCreds) return currentCreds; // cached in mem, so you can call this method multiple times
  const conf = await getConfig();
  if (!conf) throw new Error(`No config for profile "${profile}"`);
  logger?.debug({ conf });
  const { credentials } = conf;
  if (!credentials.email) throw new Error("Could not get credentials (email)");
  credentials.password = credentials.password ?? (await getPw("Please enter password"));
  if (!credentials.password) throw new Error("Could not get credentials (password)");
  currentCreds = { ...credentials, email: credentials.email, password: credentials.password }; // To make TS happy..
  logger?.debug({ ...currentCreds, password: currentCreds?.password ? "**" : undefined });
  return currentCreds;
}
