"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRegionShortName = void 0;
function getRegionShortName(region) {
    return region
        .replace("east", "-east")
        .replace("--", "-")
        .split("-")
        .map(part => part[0])
        .join("");
}
exports.getRegionShortName = getRegionShortName;
