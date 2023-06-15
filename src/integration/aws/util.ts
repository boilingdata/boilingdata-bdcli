export function getRegionShortName(region: string): string {
  return region
    .replace("east", "-east")
    .replace("--", "-")
    .split("-")
    .map(part => part[0])
    .join("");
}
