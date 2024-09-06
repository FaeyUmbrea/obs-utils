import { getCurrentUser, VIEWPORT_DATA, viewportChanged } from "./canvas";
import { isOBS } from "./helpers";
import { setSetting } from "./settings";

Hooks.once("init", () => {
  game.socket.on("module.obs-utils", handleEvent);
});
async function handleEvent({ eventType, targetUser, payload }) {
  if (!!targetUser && game.userId !== targetUser) return;

  if (eventType === "viewport") {
    changeViewport(payload);
  } else if (eventType === "websocketSettings") {
    await changeOBSSettings(payload);
  }
}

async function changeOBSSettings(settings) {
  await setSetting("websocketSettings", settings);
  foundry.utils.debouncedReload();
}

export function sendOBSSetting(user, settings) {
  game.socket.emit("module.obs-utils", {
    eventType: "websocketSettings",
    targetUser: user,
    payload: settings,
  });
}

function changeViewport({ viewport, userId }) {
  if (!isOBS()) return;
  // First update the collection of viewport data
  VIEWPORT_DATA.set(userId, viewport);
  // Then immediately try to animate to that users position
  viewportChanged(userId);
}

let viewportTrackingActive = false;

export function activateViewportTracking() {
  viewportTrackingActive = true;
}

export function deactivateViewportTracking() {
  viewportTrackingActive = false;
}

export function socketCanvas(_canvas, position) {
  if (!viewportTrackingActive) {
    return;
  }
  game.socket.emit("module.obs-utils", {
    eventType: "viewport",
    targetUser: undefined,
    payload: { viewport: position, userId: getCurrentUser() },
  });
}
