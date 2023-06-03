import ora from "ora";

const spinner = ora({ spinner: "dots" });

export const updateSpinnerText = (message: string): void => {
  if (spinner.isSpinning) {
    spinner.text = message;
    return;
  }
  spinner.start(message);
};

export const stopSpinner = (): void => {
  if (spinner.isSpinning) spinner.stop();
};

export const spinnerError = (message?: string): void => {
  if (spinner.isSpinning) spinner.fail(message);
};

export const spinnerSuccess = (message?: string): void => {
  if (spinner.isSpinning) spinner.succeed(message);
};

export const spinnerInfo = (message: string): void => {
  spinner.info(message);
};
