import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Flame, Handshake, Heart, Rainbow, RotateCcw, Share2, Sparkles, VenetianMask } from "lucide-react";
import { loveMatch, LOVE_CATEGORIES, type LoveResult } from "../lib/util";
import { updateRoomState } from "../lib/rtc";
import type { OnlineGameProps } from "../pages/Room";

export type GameProps = { mode: "local"; onExit: () => void } | OnlineGameProps;

const CATEGORY_ICONS: Record<string, ReactNode> = {
  love: <Heart className="w-5 h-5 text-coral fill-coral" />,
  friends: <Handshake className="w-5 h-5 text-coral" />,
  soulmates: <Sparkles className="w-5 h-5 text-coral" />,
  crime: <VenetianMask className="w-5 h-5 text-coral" />,
  chaos: <Flame className="w-5 h-5 text-coral" />,
  vibe: <Rainbow className="w-5 h-5 text-coral" />,
};

export default function LoveMatch(props: GameProps) {
  return props.mode === "local" ? <LoveMatchLocal {...props} /> : <LoveMatchOnline {...props} />;
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="card p-6 md:p-10 shadow-warm relative overflow-hidden">
      <div className="absolute -top-16 -left-16 w-72 h-72 bg-coral/15 rounded-full blur-3xl" />
      <div className="absolute -bottom-20 -right-20 w-72 h-72 bg-rose/25 rounded-full blur-3xl" />
      <div className="relative">{children}</div>
    </div>
  );
}

/* ================= local ================= */

function LoveMatchLocal({ onExit }: { onExit: () => void }) {
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [revealed, setRevealed] = useState(false);
  const result = useMemo(() => (revealed ? loveMatch(a, b) : null), [revealed, a, b]);
  const replay = () => {
    setRevealed(false);
    setA("");
    setB("");
  };

  return (
    <Shell>
      <div className="mb-6">
        <span className="pill bg-blush text-coral-deep">
          <Heart className="w-3 h-3" /> Love Match
        </span>
        <h2 className="heading-serif text-4xl md:text-5xl text-plum mt-3">Your couple chemistry, revealed.</h2>
        <p className="text-plum-soft mt-2">Two names. A little letter-magic. A verdict for the ages.</p>
      </div>
      {revealed ? (
        result && <LoveResult result={result} onReplay={replay} onExit={onExit} />
      ) : (
        <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr] items-end">
          <div>
            <label className="text-xs font-semibold text-plum-soft uppercase tracking-wider">You</label>
            <input
              className="input mt-1.5 text-lg"
              value={a}
              onChange={(e) => setA(e.target.value.slice(0, 30))}
              placeholder="Your name"
            />
          </div>
          <Heart className="w-8 h-8 text-coral hidden md:block mx-2 mb-3 pulse-heart fill-coral" />
          <div>
            <label className="text-xs font-semibold text-plum-soft uppercase tracking-wider">Your partner</label>
            <input
              className="input mt-1.5 text-lg"
              value={b}
              onChange={(e) => setB(e.target.value.slice(0, 30))}
              placeholder="Partner's name"
            />
          </div>
          <div className="md:col-span-3 flex flex-wrap items-center justify-between gap-3 pt-2">
            <button className="btn-ghost text-sm" onClick={onExit}>
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <button
              className="btn-primary text-lg !py-3.5 !px-8"
              disabled={!a.trim() || !b.trim()}
              onClick={() => setRevealed(true)}
            >
              <Sparkles className="w-5 h-5" /> Reveal our chemistry
            </button>
          </div>
        </div>
      )}
    </Shell>
  );
}

/* ================= online ================= */

interface LmState {
  submissions?: { host?: { name: string }; guest?: { name: string } };
  reveal?: boolean;
}

function LoveMatchOnline({ room, broadcast, refresh, onExit }: OnlineGameProps) {
  const role = room.role === "guest" ? "guest" : "host";
  const otherRole = role === "host" ? "guest" : "host";
  const state = (room.state ?? {}) as LmState;
  const subs = state.submissions ?? {};
  const mine = subs[role];
  const reveal = !!state.reveal;
  const [name, setName] = useState("");
  const [sending, setSending] = useState(false);

  const result = useMemo(() => {
    if (!reveal) return null;
    const na = subs.host?.name || room.hostName || "";
    const nb = subs.guest?.name || room.guestName || "";
    return loveMatch(na, nb);
  }, [reveal, subs.host?.name, subs.guest?.name, room.hostName, room.guestName]);

  const submit = async () => {
    const n = name.trim();
    if (!n) return;
    setSending(true);
    try {
      const nextSubs = { ...subs, [role]: { name: n } };
      const both = !!(nextSubs.host && nextSubs.guest);
      await updateRoomState(room.code, room.state, { submissions: nextSubs, reveal: both });
      await broadcast("state-changed");
      await refresh();
    } finally {
      setSending(false);
    }
  };

  const replay = async () => {
    await updateRoomState(room.code, room.state, { submissions: {}, reveal: false });
    await broadcast("state-changed");
    await refresh();
    setName("");
  };

  return (
    <Shell>
      <div className="mb-6">
        <span className="pill bg-blush text-coral-deep">
          <Heart className="w-3 h-3" /> Love Match · Online
        </span>
        <h2 className="heading-serif text-4xl md:text-5xl text-plum mt-3">Both hearts, one reveal.</h2>
        <p className="text-plum-soft mt-2">Type your name. When you've both submitted, the answer appears at the same time.</p>
      </div>
      {reveal ? (
        result && <LoveResult result={result} onReplay={replay} onExit={onExit} />
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          <div className="card p-6 bg-white/70">
            <div className="text-xs text-plum-soft uppercase tracking-wider font-semibold">
              You ({role === "host" ? room.hostName : room.guestName})
            </div>
            {mine ? (
              <div className="mt-3">
                <div className="heading-serif text-3xl text-plum flex items-center gap-2">
                  {mine.name} <Heart className="w-5 h-5 text-mint fill-mint" />
                </div>
                <div className="text-sm text-plum-soft mt-1">Locked in. Waiting for the reveal…</div>
              </div>
            ) : (
              <>
                <input
                  className="input mt-3 text-lg"
                  value={name}
                  onChange={(e) => setName(e.target.value.slice(0, 30))}
                  placeholder="Type your name"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void submit();
                  }}
                />
                <button className="btn-primary mt-4 w-full" onClick={() => void submit()} disabled={sending || !name.trim()}>
                  Lock it in
                </button>
              </>
            )}
          </div>
          <div className="card p-6 bg-white/50 border-dashed">
            <div className="text-xs text-plum-soft uppercase tracking-wider font-semibold">
              Partner ({(otherRole === "host" ? room.hostName : room.guestName) || "waiting"})
            </div>
            {subs[otherRole] ? (
              <div className="mt-3 heading-serif text-3xl text-plum flex items-center gap-2">
                Ready <Heart className="w-5 h-5 text-mint fill-mint" />
              </div>
            ) : (
              <div className="mt-3 heading-serif text-2xl text-plum-soft italic flex items-center gap-2">
                <Heart className="w-5 h-5 text-coral pulse-heart fill-coral/60" /> Waiting for their name…
              </div>
            )}
          </div>
        </div>
      )}
    </Shell>
  );
}

/* ================= shared reveal ================= */

function LoveResult({ result, onReplay, onExit }: { result: LoveResult; onReplay: () => void; onExit: () => void }) {
  const [stage, setStage] = useState(0);
  const [shown, setShown] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setStage(1), 1200);
    const t2 = setTimeout(() => setStage(2), 2800);
    const t3 = setTimeout(() => setStage(3), 4600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [result]);

  useEffect(() => {
    if (stage < 2) return;
    let raf = 0;
    const start = performance.now();
    const dur = 1700;
    const target = result.percentage;
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - k, 3);
      setShown(Math.round(eased * target));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [stage, result.percentage]);

  const share = async () => {
    const text = `Our couple chemistry: ${result.percentage}% — ${result.category.label}\nOn CouplePlay`;
    try {
      if (navigator.share) await navigator.share({ text });
      else await navigator.clipboard.writeText(text);
    } catch {
      /* dismissed */
    }
  };

  return (
    <div>
      <div className="flex items-center justify-center gap-3 md:gap-8 py-8 relative">
        <motion.div
          initial={{ x: -160, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="heading-serif text-3xl md:text-5xl text-plum"
        >
          {result.a || "You"}
        </motion.div>
        <motion.div
          initial={{ scale: 0, rotate: -30 }}
          animate={{ scale: [0, 1.4, 1], rotate: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <Heart className="w-10 h-10 md:w-14 md:h-14 text-coral fill-coral" />
        </motion.div>
        <motion.div
          initial={{ x: 160, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="heading-serif text-3xl md:text-5xl text-plum"
        >
          {result.b || "Them"}
        </motion.div>
      </div>

      <AnimatePresence>
        {stage >= 1 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-2 space-y-3">
            <LetterRow label={result.a} clean={result.aClean} cancelled={result.aCancelled} />
            <LetterRow label={result.b} clean={result.bClean} cancelled={result.bCancelled} />
            <div className="text-center text-sm text-plum-soft mt-3">
              <span className="pill bg-blush text-coral-deep">{result.remaining} letters remain</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {stage >= 2 && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="mt-8 text-center">
            <div className="text-plum-soft text-sm uppercase tracking-widest">Compatibility</div>
            <div className="heading-serif text-7xl md:text-9xl text-coral leading-none mt-2">{shown}%</div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {stage >= 3 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mt-6 text-center">
            <div className="text-sm text-plum-soft">Your couple chemistry is</div>
            <div className="heading-serif text-4xl md:text-5xl text-plum mt-1 flex items-center justify-center gap-3 flex-wrap">
              {result.category.label} {CATEGORY_ICONS[result.category.key] ?? <Heart className="w-5 h-5 text-coral fill-coral" />}
            </div>
            <p className="script text-2xl text-coral mt-3">{result.category.tagline}</p>
            <div className="flex flex-wrap justify-center gap-3 mt-8">
              <button className="btn-primary" onClick={onReplay}>
                <RotateCcw className="w-4 h-4" /> Replay
              </button>
              <button className="btn-ghost" onClick={() => void share()}>
                <Share2 className="w-4 h-4" /> Share Result
              </button>
              <button className="btn-ghost" onClick={onExit}>
                <ArrowLeft className="w-4 h-4" /> Games
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function LetterRow({ label, clean, cancelled }: { label: string; clean: string; cancelled: boolean[] }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-widest text-plum-soft mb-1.5">{label}</div>
      <div className="flex flex-wrap gap-1.5">
        {clean.split("").map((ch, i) => (
          <motion.span
            key={i}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: i * 0.03 }}
            className={`w-8 h-9 rounded-lg grid place-items-center font-semibold uppercase text-sm ${
              cancelled[i] ? "bg-blush/60 text-plum-soft line-through decoration-coral" : "bg-white text-plum border border-coral/20"
            }`}
          >
            {ch}
          </motion.span>
        ))}
        {clean.length === 0 && <span className="text-sm text-plum-soft italic">add a name…</span>}
      </div>
    </div>
  );
}

export { LOVE_CATEGORIES };
