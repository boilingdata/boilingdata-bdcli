"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.disableSpinner = disableSpinner;
exports.enableSpinner = enableSpinner;
exports.updateSpinnerText = updateSpinnerText;
exports.resumeSpinner = resumeSpinner;
exports.stopSpinner = stopSpinner;
exports.spinnerWarn = spinnerWarn;
exports.spinnerError = spinnerError;
exports.spinnerSuccess = spinnerSuccess;
exports.spinnerInfo = spinnerInfo;
const ora_1 = __importDefault(require("ora"));
const chalk_1 = __importDefault(require("chalk"));
const error = chalk_1.default.bold.red;
const success = chalk_1.default.green;
const blue = chalk_1.default.blue;
const warning = chalk_1.default.hex("#FFA500"); // Orange color
const spinner = (0, ora_1.default)({ spinner: "dots" });
let isEnabled = true;
function disableSpinner() {
    isEnabled = false;
}
function enableSpinner() {
    isEnabled = true;
}
function updateSpinnerText(message) {
    if (!isEnabled)
        return;
    spinner.text = blue(message);
    if (spinner.isSpinning)
        return;
    spinner.start();
}
function resumeSpinner() {
    if (!isEnabled)
        return;
    if (!spinner.text)
        return; // error?
    spinner.start();
}
function stopSpinner() {
    if (!isEnabled)
        return;
    if (spinner.isSpinning)
        spinner.stop();
}
function spinnerWarn(message) {
    if (!isEnabled)
        return;
    spinner.warn(message ? warning(message) : warning(spinner.text));
}
function spinnerError(message, forceExit = true) {
    // We show errors regardless whether the spinner is disabled
    spinner.fail(message ? error(message) : undefined);
    if (forceExit)
        process.exit(1); // error
}
function spinnerSuccess(message) {
    if (!isEnabled)
        return;
    spinner.succeed(message ? success(message) : undefined);
}
function spinnerInfo(message) {
    if (!isEnabled)
        return;
    spinner.info(blue(message));
}
