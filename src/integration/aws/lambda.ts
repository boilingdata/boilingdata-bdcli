import {
  FunctionConfiguration,
  LambdaClient,
  ListFunctionsCommand,
  ListFunctionsCommandOutput,
} from "@aws-sdk/client-lambda";
import { ILogger } from "../../bdcli/utils/logger_util.js";

export async function getAllLambdaFunctions(
  lambdaClient: LambdaClient,
  logger?: ILogger,
): Promise<FunctionConfiguration[]> {
  let Marker;
  const funcs: FunctionConfiguration[] = [];
  do {
    const res: ListFunctionsCommandOutput = await lambdaClient.send(new ListFunctionsCommand({ Marker }));
    logger?.debug(res?.NextMarker);
    logger?.debug(res?.Functions?.length);
    Marker = res?.NextMarker;
    if (Array.isArray(res.Functions)) funcs.push(...res.Functions);
  } while (Marker);
  return funcs;
}
