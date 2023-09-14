import ora from "ora";
import chalk from "chalk";
const error = chalk.bold.red;
const success = chalk.green;
const blue = chalk.blue;
const warning = chalk.hex("#FFA500"); // Orange color
const spinner = ora({ spinner: "dots" });
let isEnabled = true;
export function disableSpinner() {
    isEnabled = false;
}
export function enableSpinner() {
    isEnabled = true;
}
export function updateSpinnerText(message) {
    if (!isEnabled)
        return;
    spinner.text = blue(message);
    if (spinner.isSpinning)
        return;
    spinner.start();
}
export function resumeSpinner() {
    if (!isEnabled)
        return;
    if (!spinner.text)
        return; // error?
    spinner.start();
}
export function stopSpinner() {
    if (!isEnabled)
        return;
    if (spinner.isSpinning)
        spinner.stop();
}
export function spinnerWarn(message) {
    if (!isEnabled)
        return;
    spinner.warn(message ? warning(message) : warning(spinner.text));
}
export function spinnerError(message) {
    if (!isEnabled)
        return;
    spinner.fail(message ? error(message) : undefined);
}
export function spinnerSuccess(message) {
    if (!isEnabled)
        return;
    spinner.succeed(message ? success(message) : undefined);
}
export function spinnerInfo(message) {
    if (!isEnabled)
        return;
    spinner.info(blue(message));
}
