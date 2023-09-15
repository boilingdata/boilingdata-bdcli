import * as cmd from "commander";
import { ILogger } from "./logger_util.js";
export declare function addGlobalOptions(program: cmd.Command, logger: ILogger): Promise<void>;
