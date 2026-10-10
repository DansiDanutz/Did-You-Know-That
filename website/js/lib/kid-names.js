// Kids never type a nickname: they pick a made-up explorer name, so no real
// name (or anything else personal) is ever typed. Restored from the old game's sign-in.

export const KID_ADJECTIVES = Object.freeze(["Brave", "Happy", "Clever", "Swift", "Lucky", "Sunny", "Cosmic", "Jolly", "Mighty", "Bright", "Witty", "Super"]);
export const KID_NOUNS = Object.freeze(["Fox", "Owl", "Comet", "Tiger", "Panda", "Rocket", "Dragon", "Koala", "Star", "Otter", "Falcon", "Whale"]);

const pick = (list, random) => list[Math.min(list.length - 1, Math.floor(random() * list.length))];

// `random` returns a number in [0, 1), like Math.random.
export function kidNickname(random = Math.random) {
  const number = 10 + Math.min(89, Math.floor(random() * 90));
  return `${pick(KID_ADJECTIVES, random)} ${pick(KID_NOUNS, random)} ${number}`;
}

// True only for names this generator can produce ("Adjective Noun 10-99").
export function isKidNickname(name) {
  const match = /^(\p{L}+) (\p{L}+) ([1-9]\d)$/u.exec(String(name ?? ""));
  return Boolean(match) && KID_ADJECTIVES.includes(match[1]) && KID_NOUNS.includes(match[2]);
}
