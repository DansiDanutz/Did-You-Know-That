// Local sign-in, as in the old game: a profile that lives only in this browser. A random UUID
// (crypto.randomUUID), who is playing (Kids 6–12 / Teens & Adults) and a name — teens and adults
// type a first name or nickname; kids pick a made-up explorer name, so no real name is typed.
// No server account, no email, no password, no tracking. Storage never throws.
import { cleanName } from "./player-name.js";
import { isKidNickname } from "./kid-names.js";

export const PROFILE_KEY = "dyk.profile.v1";
// The old game's keys: a returning player keeps their id, audience and name.
export const LEGACY_PROFILE_KEY = "dykt-profile-v1";
export const LEGACY_SETTINGS_KEY = "dykt-settings-v1";
export const AUDIENCES = Object.freeze(["kids", "adults"]);
const PLAYER_ID_PATTERN = /^[0-9a-f-]{36}$/;

/** Kids keep only generated explorer names; everyone else a cleaned first name or nickname. */
export function nameFor(audience, name) {
  if (audience === "kids") return isKidNickname(name) ? name : "";
  return cleanName(name);
}

export function normalizeProfile(value, makeId) {
  const playerId = PLAYER_ID_PATTERN.test(value?.playerId ?? "") ? value.playerId : makeId();
  const audience = AUDIENCES.includes(value?.audience) ? value.audience : "kids";
  const name = nameFor(audience, value?.name);
  return { playerId, audience, name, signedIn: name !== "" };
}

/** Signing in validates the choice; the same id is kept so progress stays attached. */
export function signIn(profile, { audience, name }) {
  if (!AUDIENCES.includes(audience)) return { ok: false, error: "Choose who is playing." };
  const clean = nameFor(audience, name);
  if (!clean) return { ok: false, error: audience === "kids" ? "Pick an explorer name." : "Type a first name or nickname (letters only)." };
  return { ok: true, profile: { ...profile, audience, name: clean, signedIn: true } };
}

export const signOut = (profile) => ({ ...profile, name: "", signedIn: false });

function readJson(storage, key) {
  try {
    return JSON.parse(storage?.getItem(key) ?? "null");
  } catch {
    return null;
  }
}

/** The old game stored { playerId, nickname } and { audience, name } separately. */
function legacyProfile(storage) {
  const profile = readJson(storage, LEGACY_PROFILE_KEY);
  const settings = readJson(storage, LEGACY_SETTINGS_KEY);
  if (!profile && !settings) return null;
  return { playerId: profile?.playerId, audience: settings?.audience, name: settings?.name || profile?.nickname };
}

export function createProfileStore(getStorage = () => globalThis.localStorage) {
  let memory = null;
  const storage = () => {
    try {
      return getStorage() ?? null;
    } catch {
      return null;
    }
  };
  return {
    load(makeId) {
      const stored = readJson(storage(), PROFILE_KEY) ?? legacyProfile(storage()) ?? memory;
      memory = normalizeProfile(stored, makeId);
      return memory;
    },
    save(profile) {
      memory = profile;
      const backend = storage();
      if (!backend) return false;
      try {
        const { playerId, audience, name } = profile;
        backend.setItem(PROFILE_KEY, JSON.stringify({ playerId, audience, name }));
        return true;
      } catch {
        return false;
      }
    },
  };
}
