// These are necessary because Game and Canvas are not always initialized so TypeScript complains

import { flatten } from "flat";
import { getSetting } from "./settings.js";

export function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export function isOBS() {
  return (
    (!!window.obsstudio ||
      getSetting("obsMode") ||
      getSetting("obsModeUser") === game?.userId) &&
    !getSetting("obsModeGlobalDisable")
  );
}

function getFontAwesomeVersion() {
  const version = Number.parseInt(game.version.split(".")[1]);
  if (version <= 290) {
    return "6.1.0";
  }
  return "6.2.0";
}

export async function getFontawesomeVariables() {
  const response = await fetch("https://api.fontawesome.com", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    mode: "cors",
    body: `query {release(version:"${getFontAwesomeVersion()}") {icons {id familyStylesByLicense{pro{family style}}}}}`,
  });

  const json = await response.json();
  const icons = json["data"]["release"]["icons"];

  return icons
    .map((value) => {
      return value.familyStylesByLicense.pro.map((family) => {
        return (
          "fa-" + family.family + " fa-" + family.style + " fa-" + value.id
        );
      });
    })
    .flat();
}

let actorValues;

export function getActorValues() {
  if (!actorValues) {
    actorValues = Object.keys(
      flatten(
        JSON.parse(
          JSON.stringify(
            new CONFIG.Actor.documentClass({
              name: "actor",
              type: "character",
            }),
          ),
        ),
      ),
    );
  }
  return actorValues;
}

export function setActorValues(actorValueArray) {
  actorValues = actorValueArray;
}
/**
 * @returns {ObsUtilsApi}
 */
export function getApi() {
  const moduleData = game.modules.get("obs-utils");
  if (moduleData) return moduleData.api;
  else throw new Error("Something went very wrong!");
}

export function removeQuotes(s) {
  let matched = s.match(
    /^(?<!\\)(["'«»‘’‚‛“”„‟‹›])(.*)(?<!\\)["'«»‘’‚‛“”„‟‹›]$/,
  );
  let matched2 = s.match(/^\\(["'«»‘’‚‛“”„‟‹›]?.*)\\(["'«»‘’‚‛“”„‟‹›]?)$/);
  return matched ? matched[2] : matched2 ? matched2[1] + matched2[2] : s;
}
