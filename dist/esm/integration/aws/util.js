export function getRegionShortName(region) {
    return region
        .replace("east", "-east")
        .replace("--", "-")
        .split("-")
        .map(part => part[0])
        .join("");
}
