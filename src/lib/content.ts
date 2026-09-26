import { Heart, PencilLine, Brain, Users, Shuffle, type LucideIcon } from "lucide-react";

/* ---------------- game registry ---------------- */

export interface GameMeta {
  slug: string;
  title: string;
  description: string;
  icon: LucideIcon;
  accent: string;
  rounds: string;
  local: boolean;
  online: boolean;
}

export const GAMES: GameMeta[] = [
  {
    slug: "love-match",
    title: "Love Match",
    description: "Type your names, watch the letters dance, and reveal your couple chemistry.",
    icon: Heart,
    accent: "#E85F73",
    rounds: "One reveal • ~2 min",
    local: true,
    online: true,
  },
  {
    slug: "doodle-duel",
    title: "Doodle Duel",
    description: "One doodles, one guesses. Trade the pen and race the clock together.",
    icon: PencilLine,
    accent: "#7A6ADB",
    rounds: "4 rounds • 60s each",
    local: true,
    online: true,
  },
  {
    slug: "who-knows",
    title: "Who Knows Who?",
    description: "Answer sweet, silly questions about yourself — your partner tries to nail it.",
    icon: Brain,
    accent: "#E8A87C",
    rounds: "10 rounds",
    local: true,
    online: true,
  },
  {
    slug: "most-likely",
    title: "Most Likely To…",
    description: "Tap Me or Partner in secret, reveal at the same time, roast responsibly.",
    icon: Users,
    accent: "#4C9F70",
    rounds: "12 rounds • 30+ prompts",
    local: true,
    online: true,
  },
  {
    slug: "this-or-that",
    title: "This or That",
    description: "Pineapple pizza? Beach or mountains? Discover your matches and delightful opposites.",
    icon: Shuffle,
    accent: "#4C82D6",
    rounds: "12 rounds • 6 categories",
    local: true,
    online: true,
  },
];

/* ---------------- Doodle Duel ---------------- */

export const DOODLE_ROUNDS = 4;
export const DOODLE_SECONDS = 60;

export const DOODLE_WORDS = [
  "first date", "love letter", "sunset walk", "chocolate box", "teddy bear", "road trip",
  "movie night", "coffee shop", "ice cream cone", "engagement ring", "honeymoon", "anniversary",
  "valentine card", "goodnight kiss", "warm hug", "cozy blanket", "proposal", "bouquet",
  "candle dinner", "breakfast in bed", "pillow fight", "stargazing", "holding hands", "slow dance",
  "wedding cake", "love song", "mixtape", "photo album", "rainy day", "shared umbrella",
  "park bench", "picnic basket", "sushi date", "karaoke", "board game", "binge watching",
  "cooking together", "garden walk", "puppy", "kitten", "treasure map", "mystery box",
  "road adventure", "mountain view", "ocean waves", "camping tent", "city lights", "disco ball",
  "birthday cake", "surprise party", "secret note", "friendship bracelet", "matching outfits",
  "tandem bike", "roller skates", "video call", "late night text", "phone charger", "pizza slice",
  "shared dessert", "popcorn bowl", "heart doodle", "paper airplane", "jukebox", "ferris wheel",
];

export const DOODLE_COLORS = ["#3D1F35", "#E85F73", "#4C9F70", "#4C82D6", "#E8A87C", "#7A6ADB", "#111111", "#FFFFFF"];
export const DOODLE_SIZES = [3, 6, 12, 20];

/* ---------------- Who Knows Who? ---------------- */

export const WHOKNOWS_ROUNDS = 10;

export const WHOKNOWS_QUESTIONS = [
  "Your ideal Saturday morning?",
  "Your dream vacation destination?",
  "Your favourite comfort food?",
  "Your go-to karaoke song?",
  "Your biggest guilty pleasure snack?",
  "A hidden talent of yours?",
  "Your favourite childhood cartoon?",
  "Your dream job as a kid?",
  "A movie you'd rewatch anytime?",
  "Your ideal date night activity?",
  "The last book you truly finished?",
  "Your weird food combo you secretly love?",
  "Your most-used emoji?",
  "One item you'd rescue from a fire (besides me)?",
  "Your dream pet if space wasn't an issue?",
];

/* ---------------- Most Likely To… ---------------- */

export const MOSTLIKELY_ROUNDS = 12;

export const MOSTLIKELY_PROMPTS = [
  "fall asleep during a movie",
  "send the first apology after an argument",
  "cry at a romantic movie",
  "plan a surprise date",
  "burn dinner",
  "sing loudly in the shower",
  "forget where the keys are",
  "tell the same story twice",
  "overpack for a weekend trip",
  "sneak the last cookie",
  "get lost even with GPS",
  "start dancing in the kitchen",
  "laugh at their own joke",
  "send memes at 2am",
  "adopt a stray animal on the spot",
  "spend an hour picking a show to watch",
  "take the best photos on a trip",
  "plan the whole itinerary",
  "oversleep on a big day",
  "send a paragraph-long text",
  "start a playful food fight",
  "say 'I love you' first each day",
  "take longer to get ready",
  "cry happy tears at a wedding",
  "hog the blankets",
  "make the coffee in the morning",
  "volunteer for karaoke",
  "befriend the waiter",
  "lose their phone in the couch",
  "tell a truly bad pun",
  "stay up reading past 2am",
  "skip the gym for pancakes",
];

/* ---------------- This or That ---------------- */

export const THISORTHAT_ROUNDS = 12;

export interface TotPair {
  category: string;
  a: string;
  b: string;
}

export const THISORTHAT_PAIRS: TotPair[] = [
  { category: "Food", a: "Sweet", b: "Savoury" },
  { category: "Food", a: "Pizza", b: "Sushi" },
  { category: "Food", a: "Coffee", b: "Tea" },
  { category: "Food", a: "Pancakes", b: "Waffles" },
  { category: "Food", a: "Ice cream", b: "Hot chocolate" },
  { category: "Food", a: "Homemade", b: "Takeout" },
  { category: "Food", a: "Spicy", b: "Mild" },
  { category: "Travel", a: "Beach", b: "Mountains" },
  { category: "Travel", a: "Road trip", b: "Long flight" },
  { category: "Travel", a: "Big city", b: "Countryside" },
  { category: "Travel", a: "Hotel", b: "Airbnb" },
  { category: "Travel", a: "Backpack", b: "Suitcase" },
  { category: "Travel", a: "Paris", b: "Tokyo" },
  { category: "Travel", a: "Summer trip", b: "Winter trip" },
  { category: "Movies", a: "Rom-com", b: "Thriller" },
  { category: "Movies", a: "Marvel", b: "DC" },
  { category: "Movies", a: "Read the book", b: "Watch the film" },
  { category: "Movies", a: "Cinema seats", b: "Streaming at home" },
  { category: "Movies", a: "Documentary", b: "Fantasy" },
  { category: "Lifestyle", a: "Morning person", b: "Night owl" },
  { category: "Lifestyle", a: "Cats", b: "Dogs" },
  { category: "Lifestyle", a: "Text", b: "Call" },
  { category: "Lifestyle", a: "Introvert", b: "Extrovert" },
  { category: "Lifestyle", a: "Neat freak", b: "Cozy chaos" },
  { category: "Lifestyle", a: "Gym", b: "Yoga" },
  { category: "Lifestyle", a: "Cook in", b: "Order out" },
  { category: "Relationship", a: "Little gift", b: "Big surprise" },
  { category: "Relationship", a: "Handwritten note", b: "Voice memo" },
  { category: "Relationship", a: "Date at home", b: "Date out" },
  { category: "Relationship", a: "Slow dance", b: "Fast beat" },
  { category: "Relationship", a: "Say it", b: "Show it" },
  { category: "Relationship", a: "Roses", b: "Sunflowers" },
  { category: "Random", a: "Pineapple on pizza: yes", b: "Pineapple on pizza: no" },
  { category: "Random", a: "Ketchup on eggs: yes", b: "Ketchup on eggs: no" },
  { category: "Random", a: "Superman", b: "Batman" },
  { category: "Random", a: "Ghost", b: "Alien" },
  { category: "Random", a: "Time travel", b: "Teleportation" },
  { category: "Random", a: "Read minds", b: "Turn invisible" },
  { category: "Random", a: "Talk to animals", b: "Understand every language" },
  { category: "Random", a: "Cloud castle", b: "Underwater house" },
  { category: "Random", a: "Endless summer", b: "Endless autumn" },
];
