// Decides how (and whether) to offer installing the game as an app.
// Pure: the browser facts come in, a plan comes out.
//   "hidden"  - already installed / running as the app / browser can't install
//   "prompt"  - Android, Chrome, Edge, Samsung: one tap opens the system dialog
//   "ios"     - iPhone/iPad: Apple allows no install button, show the 2 steps

export function installMode({ standalone, installedFlag, hasPrompt, userAgent = "" }) {
  if (standalone) return "hidden";
  if (hasPrompt) return "prompt"; // the browser itself says the app is not installed
  if (installedFlag) return "hidden";
  const ios = /iPhone|iPad|iPod/i.test(userAgent) || (/Macintosh/i.test(userAgent) && /Mobile/i.test(userAgent));
  return ios ? "ios" : "hidden";
}
