import * as fs from "fs/promises";
import * as yaml from "js-yaml";
import * as os from "os";
import deepmerge from "deepmerge";
import { ELogLevel, ILogger } from "./logger_util.js";
import { getPw } from "./auth_util.js";
import * as jwt from "jsonwebtoken";
import { disableSpinner } from "./spinner_util.js";

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
  sharedTokens?: string[];
  region?: string;
  mfa?: boolean;
  environment?: string;
}

export interface IDecodedSession {
  shareId: string;
  bdStsToken: string;
  minsRemaining: number;
  status: "EXPIRED" | "VALID";
  bdStsTokenPayload: jwt.JwtPayload;
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
    //if (!Object.keys(config).includes(profile)) throw new Error(`Profile "${profile}" does not exist`);
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
  try {
    const configFileData = await fs.readFile(configFile, "utf8");
    const config = <IConfig | IConfigProfiles>yaml.load(configFileData, { filename: configFile });
    if (config.credentials && profile === "default") return <IConfig>config; // no profiles
    logger?.debug({ profile, keys: Object.keys(config) });
    if (Object.keys(config).includes(profile)) {
      return Object.values(config).at(Object.keys(config).indexOf(profile));
    }
  } catch (err) {
    logger?.debug({ err });
  }
  return;
}

export async function getConfigSettings(logger?: ILogger): Promise<{ [key: string]: string }> {
  const conf = await getConfig(logger);
  const settings = conf?.settings ?? {};
  logger?.debug({ settings });
  return settings;
}

function camalize(str: string): string {
  return str.toLowerCase().replace(/[^a-zA-Z0-9]+(.)/g, (_m, chr) => chr.toUpperCase());
}

export function getEnvSettings(logger?: ILogger): any {
  const _bdEnvs = <[string, any][]>Object.entries(process.env)
    .filter(e => e[0].startsWith("BD_") && e[0].length > 3 && e.length >= 1 && e[1] && e[1].length > 0)
    .map(e => [camalize(e[0].substring(3).toLowerCase()), e[1]]);
  const bdEnvs = _bdEnvs.map(e => ({ [`${e[0]}`]: e[1] })).reduce((prev, curr) => ({ ...prev, ...curr }), {});
  logger?.debug({ bdEnvs });
  return bdEnvs;
}

export function applyGlobalConfigHooks(opts: { [key: string]: any }, logger: ILogger): void {
  // global opts handling due to the Commander short comings
  if (opts["profile"]) setProfile(opts["profile"]);
  if (opts["logLevel"]) logger.setLogLevel(opts["level"]);
  if (opts["debug"]) logger.setLogLevel(ELogLevel.DEBUG);
  if (opts["disableSpinner"]) disableSpinner();
}

export async function combineOptsWithSettings(opts: any, logger: ILogger): Promise<{ [key: string]: string }> {
  const envSettings = getEnvSettings(logger);
  // we get e.g. BD_PROFILE, so we can get settings
  applyGlobalConfigHooks(envSettings, logger);
  const options = deepmerge<{ [key: string]: string }>({ ...(await getConfigSettings(logger)), ...envSettings }, opts);
  // then we also re-apply as we get possibly settings from the configuration file for the profile
  applyGlobalConfigHooks(options, logger);
  logger?.debug({ options: { ...options, password: options["password"] ? "**" : undefined } });
  return options;
}

export function serialiseTokensList(sharedTokens: IDecodedSession[]): string[] {
  return sharedTokens.map(entry => `${entry.shareId}:${entry.bdStsToken}`);
}

export async function getCachedTokenSessions(logger?: ILogger, showExpired = false): Promise<IDecodedSession[]> {
  const conf = await getConfig();
  const decodedList = (conf?.credentials?.sharedTokens ?? [])
    .concat(conf?.credentials?.bdStsToken ?? [])
    ?.map(token => {
      let shareId: string | undefined = "NA";
      let bdStsToken: string | undefined = token;
      if (token.includes(":")) {
        [shareId, bdStsToken] = token.split(":");
      }
      if (!bdStsToken) throw new Error("Could not parse token");
      const bdStsTokenPayload = jwt.decode(bdStsToken, { json: true });
      if (!bdStsTokenPayload) throw new Error("Could not parse JWT token payload");
      const minsRemaining = bdStsTokenPayload?.exp
        ? Math.floor((new Date(bdStsTokenPayload?.exp * 1000).getTime() - Date.now()) / (60 * 1000))
        : -1;
      logger?.debug({ minsRemaining, bdStsTokenPayload });
      const status: "EXPIRED" | "VALID" = minsRemaining <= 0 ? "EXPIRED" : "VALID";
      if (!showExpired && status == "EXPIRED") return;
      return { shareId, bdStsToken, minsRemaining, status, bdStsTokenPayload };
    })
    .filter(e => !!e);
  return <IDecodedSession[]>decodedList ?? [];
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
