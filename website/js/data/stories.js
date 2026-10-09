// Language-neutral episode structure. All texts (per language and audience)
// live in js/i18n/locales/<lang>.js under `stories[<id>]`.
//
// To publish a new episode:
//   1. add an entry here (pages, quiz answer index per audience, card),
//   2. add its texts to every locale file (tests fail if one is missing),
//   3. when the video is live: publication.<audience>.publicationStatus =
//      "published", youtubeId and publishedAt (validated by the tests),
//
// Reading order: story pages → mission (what you can find out) → the
// guardian's optional questions → the free card. The book teaches everything
// the questions ask; nothing depends on the video or on a word from it.
// Kids quizzes have 3 choices, adult quizzes 4. In story text, wrap the
// hidden spark word in [[double brackets]].

export const CHANNEL_URL = "https://www.youtube.com/@Did-You-Know-that-2026";

export const STORIES = Object.freeze([
  {
    id: "why-wonder",
    episode: 1,
    house: "home",
    // Publication data per audience (docs/DATA-CONTRACT.md). A video plays only
    // when status is "published" with a valid youtubeId and publishedAt.
    publication: {
      kids: {
        schemaVersion: 1,
        episodeId: "kids-001-who-keeps-pressing-play",
        slug: "who-keeps-pressing-play",
        topic: "digital-life",
        publicationStatus: "draft",
        videoLanguage: "en",
        narrationLanguages: ["en", "ro", "es", "fr", "de", "it", "zh"],
      },
      adults: {
        schemaVersion: 1,
        episodeId: "adults-001-re-reading-trap",
        slug: "re-reading-trap",
        topic: "everyday-life",
        publicationStatus: "draft",
        videoLanguage: "en",
        narrationLanguages: ["en", "ro", "es", "fr", "de", "it", "zh"],
      },
    },
    card: { id: "card-ep1-why", number: "001", art: { kids: "bolt", adults: "brain" } },
    pages: {
      kids: [
        { id: "opening", type: "title", art: "bolt" },
        { id: "rocket", type: "story", art: "bolt", spark: "sunset" },
        { id: "mystery", type: "story", art: "bulb", spark: "mystery" },
        { id: "willpower", type: "story", art: "phone", spark: "willpower" },
        { id: "hint", type: "story", art: "owl", spark: "autoplay" },
        { id: "test", type: "story", art: "phone", spark: "choose" },
        { id: "bedtime", type: "story", art: "hourglass", spark: "sleep" },
        { id: "launch", type: "story", art: "bolt", spark: "boss" },
        { id: "mission", type: "mission" },
        { id: "q1", type: "quiz", answer: { kids: 1, adults: 1 } },
        { id: "q2", type: "quiz", answer: { kids: 0, adults: 0 } },
        { id: "q3", type: "quiz", answer: { kids: 2, adults: 2 } },
        { id: "reward", type: "reward" },
        { id: "end", type: "end" },
      ],
      adults: [
        { id: "opening", type: "title", art: "brain" },
        { id: "case", type: "story", art: "brain", spark: "otters" },
        { id: "puzzle", type: "story", art: "hourglass", spark: "twice" },
        { id: "flip", type: "story", art: "clocktower", spark: "recall" },
        { id: "twist", type: "story", art: "bulb", spark: "confident" },
        { id: "mechanism", type: "story", art: "brain", spark: "difficulty" },
        { id: "limits", type: "story", art: "coins", spark: "pooled" },
        { id: "method", type: "story", art: "bulb", spark: "check" },
        { id: "mission", type: "mission" },
        { id: "q1", type: "quiz", answer: { kids: 0, adults: 0 } },
        { id: "q2", type: "quiz", answer: { kids: 2, adults: 2 } },
        { id: "q3", type: "quiz", answer: { kids: 1, adults: 1 } },
        { id: "reward", type: "reward" },
        { id: "end", type: "end" },
      ],
    },
  },
  {
    id: "eternal-honey",
    episode: 2,
    house: "desert",
    publication: {
      kids: {
        schemaVersion: 1,
        episodeId: "kids-002-honey",
        slug: "honey-that-never-spoils",
        topic: "animals",
        publicationStatus: "draft",
        videoLanguage: "en",
        narrationLanguages: [],
      },
      adults: {
        schemaVersion: 1,
        episodeId: "adults-002-ancient-honey",
        slug: "ancient-honey",
        topic: "history",
        publicationStatus: "draft",
        videoLanguage: "en",
        narrationLanguages: [],
      },
    },
    card: { id: "card-001-eternal-honey", number: "002", art: "jar" },
    pages: [
      { id: "opening", type: "title", art: "pyramid" },
      { id: "tomb", type: "story", art: "pyramid", spark: "afterlife" },
      { id: "hive", type: "story", art: "bee", spark: "dance" },
      { id: "mission", type: "mission" },
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
