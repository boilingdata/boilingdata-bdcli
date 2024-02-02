export function getAwsRegionShortName(region) {
    // a bit hacky
    const splits = region
        .replace("east-", "-east-")
        .replace("--", "-")
        .replace("west-", "-west-")
        .replace("--", "-")
        .split("-");
    if (splits.length != 3 && splits.length != 4)
        throw new Error(`Invalid AWS Region: ${region}`);
    if (splits.length == 4) {
        return `${splits[0]}${splits[1]?.[0]}${splits[2]?.[0]}${splits[3]}`;
    }
    return `${splits[0]}${splits[1]?.[0]}${splits[2]}`;
}
