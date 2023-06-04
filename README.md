# bdcli - Command Line Client for BoilingData

## Install

```shell
yarn install boilingdata/boilingdata-bdcli
npx bdcli -h
```

## Code Architecture & Development

- `src/core/` core functionality code that is agnostic to command line args handling. Keep the code decoupled with clear interfaces so that it could be moved as a separate node module (SDK) in the future if needed. Agnostic to command line args parsing, logging, and authentication handling, i.e. can work with the `src/utils/` utilities.
- `src/bdcli/` contains all the client commands in their own directories. Keep the code lightweight and focus on command line args handling and wiring with utils and core functionality. Goal is to be able to create PRs that add new functionality by adding new files without having to modify other commmands.
- `src/utils/` general utilities consumed by multiple `bdcli` commands. Includes for example authentication handling and logging.

```shell
yarn build
BD_USERNAME=<username> BD_PASSWORD=<password> ./bdcli -h
```

# Possible to-be-implemented features and ideas

- [ ] Stream logs to S3, consider using e.g. [s3-streamlogger](https://github.com/Coggle/s3-streamlogger)
