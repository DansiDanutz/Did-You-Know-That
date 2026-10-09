// Language-neutral episode structure. All texts (per language and audience)
// live in js/i18n/locales/<lang>.js under `stories[<id>]`.
//
// To publish a new episode:
//   1. add an entry here (pages, quiz answer index per audience, card),
//   2. add its texts to every locale file (tests fail if one is missing),
//   3. set `youtubeId` once the video is live,
//   4. show the special word on a neon card in the middle of the video and
//      store its SHA-256 (per audience if the videos differ):
//        printf 'WORD' | shasum -a 256
//
// Rule: teaser pages and spark notes must NEVER contain quiz answers; the
// answers are only in the YouTube video.
// Reading order: teaser pages → mission (what to find out in the video)
// → gate (listen on YouTube) → the guardian's quiz → reward.
// Kids quizzes have 3 choices, adult quizzes 4. In story text, wrap the
// hidden spark word in [[double brackets]].

export const CHANNEL_URL = "https://www.youtube.com/@Did-You-Know-that-2026";

export const STORIES = Object.freeze([
  {
    id: "why-wonder",
    episode: 1,
    house: "home",
    youtubeId: { kids: "", adults: "" }, // ← paste each YouTube video ID when published
    // Special word shown on the neon card in the MIDDLE of each video.
    secretHash: {
      kids: "d44fa953853bae3a2ab71f5d5236ede3b67f31aeff84aa56235be191d78f7eb5", // SUN (kids words are always simple everyday words)
      adults: "18b1cb9d01d1298fb45e2ca9a181a08134c08d7722c88c3348a11ff2171da6cc", // GOLDEN
    },
    requiredWatchRatio: 0.85,
    card: { id: "card-ep1-why", number: "001", art: { kids: "phone", adults: "hourglass" } },
    // The book tells the WHOLE story (read aloud); the special word is only in the video.
    pages: {
      kids: [
        { id: "opening", type: "title", art: "phone" },
        { id: "start", type: "story", art: "bulb", spark: "scrolling" },
        { id: "tower", type: "story", art: "clocktower", spark: "scientists" },
        { id: "videoland", type: "story", art: "monster", spark: "automatically" },
        { id: "boss", type: "story", art: "treasure", spark: "sleep" },
        { id: "deal", type: "story", art: "owl", spark: "real" },
        { id: "finale", type: "story", art: "phone", spark: "word" },
        { id: "mission", type: "mission" },
        { id: "seal", type: "gate" },
        { id: "q1", type: "quiz", answer: { kids: 2, adults: 2 } },
        { id: "q2", type: "quiz", answer: { kids: 1, adults: 0 } },
        { id: "q3", type: "quiz", answer: { kids: 0, adults: 3 } },
        { id: "reward", type: "reward" },
        { id: "end", type: "end" },
      ],
      adults: [
        { id: "opening", type: "title", art: "hourglass" },
        { id: "coldopen", type: "story", art: "phone", spark: "scroll" },
        { id: "lever", type: "story", art: "slot", spark: "lever" },
        { id: "franklin", type: "story", art: "coins", spark: "compound" },
        { id: "testing", type: "story", art: "brain", spark: "themselves" },
        { id: "minutes", type: "story", art: "hourglass", spark: "years" },
        { id: "invitation", type: "story", art: "bulb", spark: "leaderboard" },
        { id: "mission", type: "mission" },
        { id: "seal", type: "gate" },
        { id: "q1", type: "quiz", answer: { kids: 2, adults: 2 } },
        { id: "q2", type: "quiz", answer: { kids: 1, adults: 0 } },
        { id: "q3", type: "quiz", answer: { kids: 0, adults: 3 } },
        { id: "reward", type: "reward" },
        { id: "end", type: "end" },
      ],
    },
  },
  {
    id: "eternal-honey",
    episode: 2,
    house: "desert",
    youtubeId: "", // ← paste the YouTube video ID when the episode is published
    secretHash: "36c58be3956c6dad24ccd962cb856d5374cd32bb8c33815159f5fa81bcd7f46e", // NECTAR
    requiredWatchRatio: 0.85,
    card: { id: "card-001-eternal-honey", number: "002", art: "jar" },
    pages: [
      { id: "opening", type: "title", art: "pyramid" },
      { id: "tomb", type: "story", art: "pyramid", spark: "afterlife" },
      { id: "hive", type: "story", art: "bee", spark: "dance" },
      { id: "mission", type: "mission" },
      { id: "seal", type: "gate" },
      { id: "q1", type: "quiz", answer: { kids: 1, adults: 1 } },
      { id: "q2", type: "quiz", answer: { kids: 2, adults: 0 } },
      { id: "q3", type: "quiz", answer: { kids: 0, adults: 2 } },
      { id: "reward", type: "reward" },
      { id: "end", type: "end" },
    ],
  },
  {
    id: "three-hearts",
    episode: 3,
    house: "ocean",
    comingSoon: true,
    card: { id: "card-002-three-hearts", number: "003", art: "octopus" },
    pages: [],
  },
  {
    id: "lightning",
    episode: 4,
    house: "storm",
    comingSoon: true,
    card: { id: "card-003-lightning", number: "004", art: "bolt" },
    pages: [],
  },
]);
