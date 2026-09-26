/** Deterministic + shared little helpers for every CouplePlay game. */

/** Turn any string (room code) into a numeric seed. */
export function seedOf(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/**
 * Seeded shuffle — every client that knows the seed derives the same deck,
 * so two browsers stay in sync without a server picking cards.
 */
export function seededShuffle<T>(arr: T[], count: number, seed?: number): T[] {
  const a = arr.slice();
  let s = seed ?? Math.floor(Math.random() * 1e9);
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, count);
}

export function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export const norm = (s: string) => s.toLowerCase().trim().replace(/\s+/g, " ");

/** Loose "did they mean the same thing" scorer: exact 10, overlap-ish 5, else 0. */
export function textSimilarity(a: string, b: string): number {
  const x = a.trim().toLowerCase();
  const y = b.trim().toLowerCase();
  if (!x || !y) return 0;
  if (x === y) return 1;
  if (x.includes(y) || y.includes(x)) return 0.7;
  const sa = new Set(x.split(/\s+/));
  const sb = new Set(y.split(/\s+/));
  let both = 0;
  sa.forEach((w) => {
    if (sb.has(w)) both++;
  });
  return both / Math.max(sa.size, sb.size, 1);
}

export function answerPoints(a: string, b: string): number {
  const s = textSimilarity(a, b);
  return s >= 0.99 ? 10 : s >= 0.35 ? 5 : 0;
}

export function pointsTone(pts: number): { text: string; tone: string } {
  if (pts === 10) return { text: "Exact match!", tone: "text-plum bg-mint/30" };
  if (pts === 5) return { text: "So close!", tone: "text-plum bg-gold/25" };
  return { text: "Different vibes", tone: "text-plum-soft bg-blush/60" };
}

/* ---------------- Love Match letter-magic ---------------- */

export interface LoveCategory {
  key: string;
  label: string;
  tagline: string;
}

export const LOVE_CATEGORIES: LoveCategory[] = [
  { key: "love", label: "Love", tagline: "Warm, steady, and just a little dizzy in the best way." },
  { key: "friends", label: "Best Friends", tagline: "The kind of duo that finishes each other's snack orders." },
  { key: "soulmates", label: "Soulmates", tagline: "Two hearts, one very shared Spotify Wrapped." },
  { key: "crime", label: "Partners in Crime", tagline: "A little chaotic, a lot iconic. Alibi included." },
  { key: "chaos", label: "Endless Chaos", tagline: "Loud, wild, extremely fun. Neighbors have thoughts." },
  { key: "vibe", label: "Perfect Vibe", tagline: "Effortless energy. You just get each other." },
];

const cleanLetters = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");

export interface LoveResult {
  a: string;
  b: string;
  aClean: string;
  bClean: string;
  aCancelled: boolean[];
  bCancelled: boolean[];
  remaining: number;
  category: LoveCategory;
  percentage: number;
}

export function loveMatch(a: string, b: string): LoveResult {
  const n = cleanLetters(a);
  const r = cleanLetters(b);
  const aC = Array(n.length).fill(false);
  const bC = Array(r.length).fill(false);
  for (let i = 0; i < n.length; i++)
    for (let j = 0; j < r.length; j++)
      if (!bC[j] && !aC[i] && n[i] === r[j]) {
        bC[j] = true;
        aC[i] = true;
        break;
      }
  const remaining = aC.filter((x) => !x).length + bC.filter((x) => !x).length;
  const keys = LOVE_CATEGORIES.map((c) => c.key);
  let m = 0;
  const step = Math.max(1, remaining);
  while (keys.length > 1) {
    m = (m + step - 1) % keys.length;
    keys.splice(m, 1);
  }
  const category = LOVE_CATEGORIES.find((c) => c.key === keys[0]) ?? LOVE_CATEGORIES[0];
  // stable percentage for a name pair
  const v = n + "|" + r;
  let h = 2166136261;
  for (let i = 0; i < v.length; i++) {
    h ^= v.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  const base = 55 + (h % 45);
  const tweak = ((remaining * 7) % 5) - 2;
  const percentage = Math.max(51, Math.min(99, base + tweak));
  return {
    a,
    b,
    aClean: n,
    bClean: r,
    aCancelled: aC,
    bCancelled: bC,
    remaining,
    category,
    percentage,
  };
}

/** FNV-1a — used to let a guesser verify a guess without seeing the word. */
export function fnv(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return h;
}
