/**
 * Logs
 *
 * @author Dev Gui
 */
import pkg from "../../package.json" with { type: "json" };

export function sayLog(message) {
  console.log("\x1b[36m[DEADBOT | TALK]\x1b[0m", message);
}

export function inputLog(message) {
  console.log("\x1b[30m[DEADBOT | INPUT]\x1b[0m", message);
}

export function infoLog(message) {
  console.log("\x1b[34m[DEADBOT | INFO]\x1b[0m", message);
}

export function successLog(message) {
  console.log("\x1b[32m[DEADBOT | SUCCESS]\x1b[0m", message);
}

export function errorLog(message) {
  console.log("\x1b[31m[DEADBOT | ERROR]\x1b[0m", message);
}

export function warningLog(message) {
  console.log("\x1b[33m[DEADBOT | WARNING]\x1b[0m", message);
}

export function bannerLog() {
  console.log(`\x1b[36m░█▀▄░█▀▀░█▀█░█▀▄░█▀▄░█▀█░▀█▀\x1b[0m`);
  console.log(`░█░█░█▀▀░█▀█░█░█░█▀▄░█░█░░█░`);
  console.log(`\x1b[36m░▀▀░░▀▀▀░▀░▀░▀▀░░▀▀░░▀▀▀░░▀░\x1b[0m`);
  console.log(`\x1b[36m🤖 Versão: \x1b[0m${pkg.version}\n`);
}