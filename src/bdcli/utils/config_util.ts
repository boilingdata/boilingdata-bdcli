import * as fs from "fs/promises";
import * as yaml from "js-yaml";
import * as os from "os";
import deepmerge from "deepmerge";
import { ILogger } from "./logger_util.js";
import { getPw } from "./auth_util.js";

const configFile = `${os.homedir()}/.bdcli.yaml`;
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

export interface IConfig {
  credentials: ICredentials;
}

export async function hasValidConfig(): Promise<boolean> {
  try {
    const config = <any>yaml.load(await fs.readFile(configFile, "utf8"));
    if (config["credentials"] && config["credentials"]["email"]) return true;
    return false;
  } catch (err: any) {
    return false;
  }
}

export async function updateConfig(updates: IConfig): Promise<void> {
  let config = {};
  try {
    config = <object>yaml.load(await fs.readFile(configFile, "utf8"));
  } catch (err: any) {
    if (err?.code != "ENOENT") throw err;
  }
  await fs.writeFile(configFile, yaml.dump(deepmerge(config, updates)), {
    encoding: "utf8",
    flag: "w",
    mode: 0o600,
  });
}

export async function getConfig(): Promise<IConfig> {
  return <IConfig>yaml.load(await fs.readFile(configFile, "utf8"));
}

export async function getCredentials(
  logger?: ILogger,
): Promise<ICredentials & Required<Pick<ICredentials, "email" | "password">>> {
  if (currentCreds) return currentCreds; // cached in mem, so you can call this method multiple times
  const { credentials } = await getConfig();
  if (!credentials.email) throw new Error("Could not get credentials");
  credentials.password = credentials.password ?? (await getPw("Please enter password"));
  currentCreds = { ...credentials, email: credentials.email, password: credentials.password }; // To make TS happy..
  logger?.debug({ ...currentCreds, password: currentCreds?.password ? "**" : undefined });
  return currentCreds;
}
