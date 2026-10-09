// Episode 1 · The House of Family · "Family Is Where Love Begins".
// Content of the first house, from David's brief (9 Oct 2026): Dexter's
// introduction, the world, the cottage, the television, the storybook, the five
// scene-based challenges, the Heart of Kindness, the kindness mission.
// English pilot. Every voiced line has an id: assets/voice/daxter/en/family/<id>.mp3
// (tools/make-family-voice.mjs). {name} is the child's name, used only on the
// device; lines without {name} are also recorded so no name is ever required.
//
// The story on the television is the illustrated storybook below (STORYBOOK),
// read scene by scene inside the game. There is no video.

export const FAMILY_HOUSE_ID = "house-of-family";

// ---------------------------------------------------------------- Dexter's lines
export const LINES = Object.freeze({
  // Meeting Dexter (after Start). The name clip "Hi, {name}!" plays first when it exists.
  "intro-1": "My name is Dexter! I'm so happy you're here!",
  "intro-2": "Do you know something? I've been waiting for a very special friend to explore this wonderful world with me. And guess what?",
  "intro-3": "That special friend is YOU!",
  "intro-4": "Today, we're going on our very first adventure together. We'll discover beautiful places, meet interesting characters, and learn amazing things about ourselves and the people we love.",
  "intro-ask": "Are you ready to come with me?",
  "intro-yes": "Yes! I knew it! Hold my hand, here we go!",
  "intro-more": "Of course! In this world, every house has a story. Some stories are funny, some are a little bit sad, and every single one teaches us something about being a good friend. And at the end of every story, I'll ask you a few questions. Ready now?",
  // The world (Dexter on the road).
  "world-1": "Look at this beautiful place! This is our Adventure World!",
  "world-2": "Can you see those houses? Every house has a special story waiting for us. And every story teaches us something important about life.",
  "world-3": "Sometimes we'll learn how to be kind. Sometimes we'll learn how to be brave. And sometimes we'll discover how to make the people we love feel happy.",
  "world-4": "After every adventure, I'll ask you a few questions. When you understand the story, you'll earn a special reward and unlock the next adventure! And don't worry if you don't know an answer. We'll discover it together!",
  "world-go": "Let's go to the first house!",
  // Arriving at the House of Family.
  "arrive-1": "We've arrived at our first house! This is the House of Family.",
  "arrive-2": "Do you know what makes a family special?",
  "arrive-3": "It's not how big your house is. It's not how many toys you have. It's the love we share with the people who care about us.",
  "arrive-4": "Come inside. I have a beautiful story to show you!",
  // Inside: the television.
  "tv-1": "Look! There's a television! I have a very special story for you. It's about a family, two children, and something really important.",
  "tv-2": "But I need your help. Can you turn on the television?",
  "tv-on": "Yes! Here it comes!",
  // After the story.
  "after-1": "Wow! That was such a beautiful story!",
  "after-2": "Emma and Leo learned something really important today. Even when we make mistakes, we can choose to be kind.",
  "after-3": "And now I have a little challenge for you! Are you ready?",
  // Challenge helpers.
  "retry-1": "Almost! Let's think about what happened in our story.",
  "retry-2": "Hmm, let's look again. You can do it!",
  // Reward.
  "reward-1": "YOU DID IT! I'm so proud of how carefully you listened!",
  "reward-2": "You've earned your very first Adventure Heart: the Heart of Kindness!",
  "reward-3": "Here is your certificate. You are a Friend of Dexter, and a Guardian of the Heart of Kindness.",
  // The real-life kindness mission (optional, no proof needed).
  "kindness-1": "Before we visit our next house, I have one tiny mission for you. Today, tell someone in your family something you love about them.",
  "kindness-2": "It could be your mommy, daddy, brother, sister, grandma, grandpa, or anyone who takes care of you. That's how we bring a little magic from our adventure into the real world!",
  "kindness-yes": "Thank you! I'll write it in your Adventure Journal.",
  // Leaving.
  "leave-1": "That was a wonderful first adventure! Today, we learned that being part of a family means caring, helping, listening, and showing love.",
  "leave-2": "But our journey is only beginning! Look, another adventure is waiting for us. Would you like to discover what's inside?",
});

// ---------------------------------------------------------------- the five challenges
// Each option carries a feeling or a kind/unkind choice; exactly one is right.
// Wrong answers get Dexter's guidance and a second look at the scene, never shame.
export const CHALLENGES = Object.freeze([
  {
    id: "feelings",
    title: "Understanding feelings",
    scene: "leo-sad",
    prompt: "Look at Leo. How do you think he's feeling?",
    options: [
      { id: "happy", icon: "😊", label: "Happy" },
      { id: "sad", icon: "😢", label: "Sad", correct: true },
      { id: "angry", icon: "😠", label: "Angry" },
    ],
    right: "That's right! Leo felt sad because Emma shouted. Sometimes our words can hurt someone's feelings.",
    wrong: "Hmm, let's look at Leo's face again. His eyes are down and his smile is gone.",
  },
  {
    id: "speak",
    title: "How should we speak?",
    scene: "tower",
    prompt: "Oh no! Emma knocked over Leo's tower by accident. What would be a kind thing to say?",
    options: [
      { id: "sorry", icon: "💬", label: "“I'm sorry! Can I help you rebuild it?”", correct: true },
      { id: "problem", icon: "🙄", label: "“It's your problem!”" },
      { id: "away", icon: "🚫", label: "“Go away!”" },
    ],
    right: "Wonderful! Kind words can make a big difference.",
    wrong: "Would those words make Leo feel better, or worse? Let's choose words that help.",
  },
  {
    id: "help",
    title: "Helping our family",
    scene: "bags",
    prompt: "Look! Dad could use a little help. What could Emma do?",
    options: [
      { id: "carry", icon: "🛍️", label: "Help carry a small, safe bag", correct: true },
      { id: "laugh", icon: "😂", label: "Laugh and walk away" },
      { id: "hide", icon: "🙈", label: "Hide the bags" },
    ],
    right: "Exactly! Even little acts of kindness matter!",
    wrong: "Think about Dad with all those bags. What would really help him?",
  },
  {
    id: "siblings",
    title: "Loving our brothers and sisters",
    scene: "play",
    prompt: "Leo wants to spend time with his sister. What could Emma do?",
    options: [
      { id: "include", icon: "🧩", label: "Include Leo in her game", correct: true },
      { id: "shout", icon: "📢", label: "Shout at him" },
      { id: "break", icon: "💥", label: "Break his toy" },
    ],
    right: "Great choice! Playing together can make wonderful memories. And if you need a little time first, you can say so kindly: “I need a little time, then we'll play.”",
    wrong: "Leo just wants to be with his sister. Which choice shows him some love?",
  },
  {
    id: "family",
    title: "What is a family?",
    scene: "families",
    prompt: "Families can look different. What makes a family special?",
    options: [
      { id: "care", icon: "❤️", label: "Caring for each other", correct: true },
      { id: "house", icon: "🏰", label: "Having the biggest house" },
      { id: "toys", icon: "🧸", label: "Owning the most toys" },
    ],
    right: "Exactly! Love, care, and kindness help make a family special.",
    wrong: "Remember what Mom and Dad said at the end of the story. What is the real treasure?",
  },
]);

// ---------------------------------------------------------------- the storybook version
// The story Dexter reads on the television, scene by scene
// and as the "read it again" option afterwards.
export const STORYBOOK = Object.freeze({
  title: "The Little Things That Make a Family",
  scenes: [
    { id: "morning", heading: "A Beautiful Morning", text: "Sunlight fills a cozy kitchen. Mom is making breakfast, Dad is setting the table, and Emma is drawing a colourful picture. Leo runs in with his teddy bear. “Good morning, everybody!” He runs to Emma. “Emma! Can I draw with you?” Emma doesn't look up. “Not now, Leo. I'm busy!” Leo stops smiling. He looks down at his teddy bear." },
    { id: "accident", heading: "The Accident", text: "Leo reaches for a pencil… and his elbow knocks over a glass of water. It spills all over Emma's picture! “LEO! You ruined my picture!” Leo is frightened. “I'm sorry, Emma. I didn't mean to!” Mom kneels beside them. She doesn't shout. “Emma, I can see you're upset. You worked so hard. It's okay to feel angry. But we can be angry without being unkind.” She turns to Leo. “Leo, what happened?” “It was an accident. I wanted to draw with Emma.” “Thank you for telling me. Let's see how we can make things better.”" },
    { id: "words", heading: "Two Little Words", text: "Leo takes a towel and cleans the table. “I'm sorry I spilled the water. I didn't mean to hurt your drawing.” Emma sees that he is truly sad. “Thank you for helping me clean up,” she says. Then, quietly: “I'm sorry I shouted at you.” Leo smiles. “It's okay!” Emma picks up a new sheet of paper. “Would you like to help me make a new picture?” “REALLY?” “Really!”" },
    { id: "drawing", heading: "The Family Drawing", text: "They draw together. Leo draws Dad with enormous ears. “Leo! Why does Dad have such big ears?” Leo giggles. “So he can hear us when we say we love him!” Dad appears behind them. “Well, these ears just heard something wonderful!” Everyone laughs. “Let's draw our whole family!” Leo asks, “Emma, what makes us a family?” Mom smiles. “Families can look different. Some are big, some are small. Some children live with one parent, some with two, some with grandparents or other people who care for them.” Dad adds, “What matters is that we care for one another.” “And we help each other!” says Emma. “And we give hugs!” says Leo. “When someone wants a hug, absolutely!” laughs Mom." },
    { id: "surprise", heading: "The Little Surprise", text: "That afternoon, Emma sees Dad carrying groceries and, without being asked, carries a small bag. “Thank you, Emma. That was very thoughtful.” Leo helps Mom by putting napkins beside the plates. “Thank you, Leo!” Then Emma whispers, “Let's make a surprise for Mom and Dad!” They put their family drawing inside a handmade card: WE LOVE OUR FAMILY! Mom is touched. Dad kneels down. “Do you know what makes this gift so special? Not the colours, not the big heart. You made it with love.”" },
    { id: "treasure", heading: "The Real Treasure", text: "Evening. The family sits together on the sofa. “Dad?” says Leo. “Are we rich?” Dad looks surprised. “Why do you ask?” “Because Emma said treasures are things that are very special.” Dad smiles. “Well, we have something very special.” Emma looks around. “Where?” Mom gestures at all of them. “Right here. People who care about you are a wonderful kind of treasure.” Leo thinks. Then he grins. “Then I'm VERY rich!” Everyone laughs. Love grows through the little things we do every day." },
  ],
});
