import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, CheckCheck, Clock, Eraser, Eye, PencilLine, RotateCcw, TimerReset, Trash2, Trophy, Undo2 } from "lucide-react";
import { NameGate, RoundHeader, WaitingNote } from "../ui/common";
import { HeartBurst } from "../ui/bits";
import { norm, seededShuffle, seedOf } from "../lib/util";
import { DOODLE_COLORS, DOODLE_SIZES, DOODLE_WORDS, DOODLE_ROUNDS, DOODLE_SECONDS } from "../lib/content";
import { fetchRoom, fetchRoomPrivate, updateRoomPrivate, updateRoomState, getPlayerId } from "../lib/rtc";
import type { OnlineGameProps } from "../pages/Room";

export type GameProps = { mode: "local"; onExit: () => void } | OnlineGameProps;

/* ================= canvas ================= */

export interface Stroke {
  id: string;
  color: string;
  size: number;
  erase?: boolean;
  points: [number, number][];
}

const strokeId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

function paintStroke(ctx: CanvasRenderingContext2D, s: Stroke, w: number, h: number) {
  if (!s.points.length) return;
  ctx.save();
  ctx.globalCompositeOperation = s.erase ? "destination-out" : "source-over";
  ctx.strokeStyle = s.color;
  ctx.fillStyle = s.color;
  ctx.lineWidth = (s.size / 600) * w * (s.erase ? 2.2 : 1);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  s.points.forEach(([px, py], i) => {
    const x = px * w;
    const y = py * h;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  if (s.points.length === 1) {
    const [px, py] = s.points[0];
    ctx.arc(px * w, py * h, ctx.lineWidth / 2, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.stroke();
  }
  ctx.restore();
}

function paintAll(canvas: HTMLCanvasElement, strokes: Stroke[]) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const { width, height } = canvas;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, width, height);
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = "#FFFDFB";
  ctx.fillRect(0, 0, width, height);
  strokes.forEach((s) => paintStroke(ctx, s, width, height));
  ctx.restore();
}

function snapshotStrokes(strokes: Stroke[], w = 800, h = 600): string {
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  paintAll(cv, strokes);
  return cv.toDataURL("image/png");
}

function DoodleCanvas({
  readOnly,
  strokes,
  onStrokeStart,
  onStrokePoint,
  onStrokeEnd,
}: {
  readOnly: boolean;
  strokes: Stroke[];
  onStrokeStart?: (s: Stroke) => void;
  onStrokePoint?: (id: string, pt: [number, number]) => void;
  onStrokeEnd?: (id: string) => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const active = useRef<string | null>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const size = () => {
      const dpr = window.devicePixelRatio || 1;
      const r = cv.getBoundingClientRect();
      if (r.width < 10) return;
      cv.width = Math.round(r.width * dpr);
      cv.height = Math.round(r.height * dpr);
      paintAll(cv, strokes);
    };
    size();
    const ro = new ResizeObserver(size);
    ro.observe(cv);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const cv = ref.current;
    if (cv && cv.width > 0) paintAll(cv, strokes);
  }, [strokes]);

  const pos = (e: React.PointerEvent): [number, number] => {
    const r = ref.current!.getBoundingClientRect();
    return [Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))];
  };

  return (
    <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-white border border-coral/20 shadow-warm">
      <canvas
        ref={ref}
        className={`w-full h-full ${readOnly ? "" : "canvas-cursor"}`}
        onPointerDown={(e) => {
          if (readOnly || !onStrokeStart) return;
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
          const id = strokeId();
          active.current = id;
          onStrokeStart({ id, color: "#000", size: 4, points: [pos(e)] });
        }}
        onPointerMove={(e) => {
          if (!active.current || readOnly || !onStrokePoint) return;
          onStrokePoint(active.current, pos(e));
        }}
        onPointerUp={() => {
          if (active.current && onStrokeEnd) onStrokeEnd(active.current);
          active.current = null;
        }}
        onPointerCancel={() => {
          active.current = null;
        }}
      />
      {readOnly && <div className="absolute top-2 left-2 pill bg-white/90 text-plum-soft">Watching</div>}
    </div>
  );
}

/* ================= toolbar ================= */

function Toolbar({
  color,
  setColor,
  size,
  setSize,
  erase,
  setErase,
  onUndo,
  onClear,
  canUndo,
}: {
  color: string;
  setColor: (c: string) => void;
  size: number;
  setSize: (s: number) => void;
  erase: boolean;
  setErase: (e: boolean) => void;
  onUndo: () => void;
  onClear: () => void;
  canUndo: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 mt-3">
      <div className="flex items-center gap-1.5 bg-white/70 rounded-full p-1.5 border border-coral/20">
        {DOODLE_COLORS.map((c) => (
          <button
            key={c}
            onClick={() => {
              setColor(c);
              setErase(false);
            }}
            className={`swatch-btn w-6 h-6 rounded-full border-2 ${!erase && color === c ? "border-plum scale-110" : "border-white/60"}`}
            style={{ background: c }}
            aria-label={`color ${c}`}
          />
        ))}
      </div>
      <div className="flex items-center gap-1 bg-white/70 rounded-full p-1.5 border border-coral/20">
        {DOODLE_SIZES.map((s) => (
          <button
            key={s}
            onClick={() => setSize(s)}
            className={`w-8 h-8 rounded-full flex items-center justify-center ${size === s ? "bg-blush" : "hover:bg-blush/50"}`}
            aria-label={`brush size ${s}`}
          >
            <span className="rounded-full bg-plum inline-block" style={{ width: Math.min(s, 16), height: Math.min(s, 16) }} />
          </button>
        ))}
      </div>
      <button onClick={() => setErase(!erase)} className={`btn-ghost !py-2 !px-3 text-sm ${erase ? "bg-blush" : ""}`}>
        <Eraser className="w-4 h-4" /> {erase ? "Erasing" : "Erase"}
      </button>
      <button onClick={onUndo} disabled={!canUndo} className="btn-ghost !py-2 !px-3 text-sm">
        <Undo2 className="w-4 h-4" /> Undo
      </button>
      <button onClick={onClear} className="btn-ghost !py-2 !px-3 text-sm">
        <Trash2 className="w-4 h-4" /> Clear
      </button>
    </div>
  );
}

function useTools() {
  const [color, setColor] = useState(DOODLE_COLORS[1]);
  const [size, setSize] = useState(6);
  const [erase, setErase] = useState(false);
  return { color, setColor, size, setSize, erase, setErase };
}

/** Word-length hint: letters revealed at 50% / 25% of time left. */
function HintBar({ word, tLeft, total }: { word: string; tLeft: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="text-[10px] uppercase tracking-[0.2em] text-plum-soft mr-1">Hint</span>
      {[...word].map((ch, i) =>
        ch === " " ? (
          <span key={i} className="w-3" />
        ) : (
          <span
            key={i}
            className={`min-w-[22px] h-8 grid place-items-center font-semibold text-sm border-b-2 ${
              (i === 0 && tLeft <= total * 0.5) || (i === word.length - 1 && tLeft <= total * 0.25)
                ? "border-coral text-coral"
                : "border-plum/20 text-plum-soft"
            }`}
          >
            {(i === 0 && tLeft <= total * 0.5) || (i === word.length - 1 && tLeft <= total * 0.25) ? ch : "·"}
          </span>
        )
      )}
    </div>
  );
}

function TimerPill({ tLeft }: { tLeft: number }) {
  return (
    <div className={`pill ${tLeft <= 10 ? "bg-coral text-white" : "bg-blush text-coral-deep"}`}>
      <Clock className="w-3 h-3" /> {tLeft}s
    </div>
  );
}

/* ================= main split ================= */

export default function DoodleDuel(props: GameProps) {
  return props.mode === "local" ? <DdLocal {...props} /> : <DdOnline {...props} />;
}

/* ================= LOCAL — pass & play ================= */

function DdLocal({ onExit }: { onExit: () => void }) {
  const [names, setNames] = useState({ a: "", b: "" });
  const [setup, setSetup] = useState(true);
  const [totalRounds, setTotalRounds] = useState(DOODLE_ROUNDS);
  const [seconds, setSeconds] = useState(DOODLE_SECONDS);
  const [round, setRound] = useState(0);
  const [stage, setStage] = useState<"reveal-artist" | "drawing" | "round-end" | "done">("reveal-artist");
  const [scores, setScores] = useState<[number, number]>([0, 0]);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [input, setInput] = useState("");
  const [guesses, setGuesses] = useState<{ text: string; correct: boolean }[]>([]);
  const [deck, setDeck] = useState<string[]>([]);
  const [peeked, setPeeked] = useState(false);
  const [tLeft, setTLeft] = useState(seconds);
  const [snap, setSnap] = useState<string | null>(null);
  const [guessedThis, setGuessedThis] = useState(false);
  const [stats, setStats] = useState({ correct: 0, fastest: 0 });
  const [startedAt, setStartedAt] = useState(0);
  const tools = useTools();
  const strokesRef = useRef<Stroke[]>([]);
  strokesRef.current = strokes;
  const tLeftRef = useRef(seconds);
  tLeftRef.current = tLeft;

  const drawer = round % 2;
  const guesser = 1 - drawer;
  const drawerName = drawer === 0 ? names.a || "Player 1" : names.b || "Player 2";
  const guesserName = guesser === 0 ? names.a || "Player 1" : names.b || "Player 2";
  const word = deck[round % Math.max(deck.length, 1)] ?? "";

  const start = () => {
    setDeck(seededShuffle(DOODLE_WORDS, totalRounds * 2));
    setRound(0);
    setScores([0, 0]);
    setStats({ correct: 0, fastest: 0 });
    setStage("reveal-artist");
    setSetup(false);
  };

  const beginDrawing = () => {
    setStrokes([]);
    setGuesses([]);
    setInput("");
    setPeeked(false);
    setGuessedThis(false);
    setSnap(null);
    setTLeft(seconds);
    setStartedAt(Date.now());
    setStage("drawing");
  };

  const endRound = (guessed: boolean) => {
    setSnap(snapshotStrokes(strokesRef.current));
    setGuessedThis(guessed);
    if (guessed) {
      const used = seconds - tLeftRef.current;
      setStats((s) => ({ correct: s.correct + 1, fastest: s.fastest === 0 ? used : Math.min(s.fastest, used) }));
      setScores((s) => {
        const next: [number, number] = [...s];
        next[guesser] += 10;
        next[drawer] += 5;
        return next;
      });
    }
    setStage("round-end");
  };
  const endRoundRef = useRef(endRound);
  endRoundRef.current = endRound;

  // countdown — anchored to startedAt so it can't be reset by re-renders
  useEffect(() => {
    if (stage !== "drawing") return;
    const iv = setInterval(() => {
      const left = Math.max(0, seconds - Math.floor((Date.now() - startedAt) / 1000));
      setTLeft(left);
      if (left <= 0) {
        clearInterval(iv);
        endRoundRef.current(false);
      }
    }, 250);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, round, seconds, startedAt]);

  const submitGuess = () => {
    const v = input.trim();
    if (!v || guessedThis) return;
    const correct = norm(v) === norm(word);
    setGuesses((g) => [...g, { text: v, correct }]);
    setInput("");
    if (correct) endRound(true);
  };

  if (setup) {
    return (
      <div className="card p-6 md:p-8 shadow-warm">
        <span className="pill bg-blush text-coral-deep">
          <PencilLine className="w-3 h-3" /> Doodle Duel · Local
        </span>
        <h2 className="heading-serif text-3xl text-plum mt-3">Who's drawing, who's guessing?</h2>
        <div className="grid gap-4 md:grid-cols-2 mt-5">
          <input className="input" value={names.a} onChange={(e) => setNames({ ...names, a: e.target.value.slice(0, 20) })} placeholder="Player 1" />
          <input className="input" value={names.b} onChange={(e) => setNames({ ...names, b: e.target.value.slice(0, 20) })} placeholder="Player 2" />
        </div>
        <div className="text-xs font-semibold text-plum-soft uppercase tracking-wider mt-6 mb-2">Rounds</div>
        <div className="flex gap-2 flex-wrap">
          {[2, 4, 6].map((r) => (
            <button key={r} onClick={() => setTotalRounds(r)} className={`pill border ${totalRounds === r ? "bg-coral text-white border-coral" : "bg-white/70 text-plum-soft border-coral/20"}`}>
              {r} rounds
            </button>
          ))}
        </div>
        <div className="text-xs font-semibold text-plum-soft uppercase tracking-wider mt-5 mb-2">Time per turn</div>
        <div className="flex gap-2 flex-wrap">
          {[45, 60, 90].map((s) => (
            <button key={s} onClick={() => setSeconds(s)} className={`pill border ${seconds === s ? "bg-coral text-white border-coral" : "bg-white/70 text-plum-soft border-coral/20"}`}>
              {s}s
            </button>
          ))}
        </div>
        <div className="flex justify-between mt-6">
          <button className="btn-ghost" onClick={onExit}>
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <button className="btn-primary" disabled={!names.a.trim() || !names.b.trim()} onClick={start}>
            Start game
          </button>
        </div>
      </div>
    );
  }

  if (stage === "done") {
    const winner = scores[0] === scores[1] ? "tie" : scores[0] > scores[1] ? 0 : 1;
    return (
      <div className="card p-8 text-center shadow-warm relative">
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[28px]">
          <HeartBurst count={16} seed={21} />
        </div>
        <div className="relative">
          <Trophy className="w-14 h-14 text-coral mx-auto" />
          <h2 className="heading-serif text-4xl text-plum mt-3">
            {winner === "tie" ? "It's a tie!" : `${winner === 0 ? names.a : names.b} takes the crown!`}
          </h2>
          <div className="heading-serif text-6xl text-coral mt-4">
            {scores[0]} – {scores[1]}
          </div>
          <div className="text-sm text-plum-soft mt-1">
            {names.a} · {names.b}
          </div>
          <div className="grid grid-cols-3 gap-3 mt-7 max-w-md mx-auto">
            {[
              { v: `${stats.correct}/${totalRounds}`, l: "Guessed" },
              { v: stats.fastest ? `${stats.fastest}s` : "—", l: "Fastest" },
              { v: `${totalRounds}`, l: "Turns" },
            ].map((s) => (
              <div key={s.l} className="card p-3 bg-white/70">
                <div className="heading-serif text-2xl text-coral">{s.v}</div>
                <div className="text-[10px] uppercase tracking-widest text-plum-soft mt-0.5">{s.l}</div>
              </div>
            ))}
          </div>
          <div className="flex justify-center gap-3 mt-7 flex-wrap">
            <button className="btn-primary" onClick={() => { start(); }}>
              <RotateCcw className="w-4 h-4" /> Rematch
            </button>
            <button className="btn-ghost" onClick={onExit}>
              <ArrowLeft className="w-4 h-4" /> Games
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-5 md:p-6 shadow-warm">
      <RoundHeader
        pill="Doodle Duel"
        icon={<PencilLine className="w-3 h-3" />}
        right={
          <>
            Round {round + 1} of {totalRounds} · {names.a} {scores[0]} · {scores[1]} {names.b}
          </>
        }
      />

      {stage === "reveal-artist" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center py-8">
          <div className="text-plum-soft text-sm uppercase tracking-widest">This round</div>
          <div className="heading-serif text-4xl text-plum mt-2">
            <span className="text-coral">{drawerName}</span> draws
          </div>
          <div className="text-plum-soft mt-1">{guesserName} guesses. Look away for a moment!</div>
          <div className="mt-6 max-w-md mx-auto">
            {peeked ? (
              <div className="card p-6 bg-white/80 pop-in">
                <div className="text-xs text-plum-soft uppercase tracking-widest">Your secret word</div>
                <div className="heading-serif text-4xl text-plum mt-2 capitalize">{word}</div>
                <button className="btn-primary mt-4 w-full" onClick={beginDrawing}>
                  Ready! Start the timer
                </button>
              </div>
            ) : (
              <button className="btn-primary" onClick={() => setPeeked(true)}>
                <Eye className="w-4 h-4" /> {drawerName}, tap to see your word
              </button>
            )}
          </div>
        </motion.div>
      )}

      {stage === "drawing" && (
        <div className="grid md:grid-cols-[1fr_320px] gap-5">
          <div>
            <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
              <HintBar word={word} tLeft={tLeft} total={seconds} />
              <TimerPill tLeft={tLeft} />
            </div>
            <DoodleCanvas
              readOnly={false}
              strokes={strokes}
              onStrokeStart={(s) =>
                setStrokes((cur) => [...cur, { ...s, color: tools.erase ? "#000" : tools.color, size: tools.size, erase: tools.erase }])
              }
              onStrokePoint={(id, pt) => setStrokes((cur) => cur.map((s) => (s.id === id ? { ...s, points: [...s.points, pt] } : s)))}
              onStrokeEnd={() => {}}
            />
            <Toolbar
              {...tools}
              canUndo={strokes.length > 0}
              onUndo={() => setStrokes((cur) => cur.slice(0, -1))}
              onClear={() => setStrokes([])}
            />
          </div>
          <div className="flex flex-col">
            <div className="text-sm text-plum-soft mb-2">
              Guesser: <b className="text-plum">{guesserName}</b>
            </div>
            <div className="card p-3 bg-white/70 flex-1 flex flex-col min-h-[220px]">
              <div className="flex-1 overflow-y-auto space-y-2 max-h-[280px]">
                {guesses.length === 0 && <div className="text-sm text-plum-soft italic">No guesses yet…</div>}
                {guesses.map((g, i) => (
                  <div key={i} className={`text-sm px-3 py-2 rounded-xl ${g.correct ? "bg-mint/30 text-plum font-semibold" : "bg-blush/50 text-plum"}`}>
                    {g.text} {g.correct && <CheckCheck className="w-4 h-4 inline text-mint" />}
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-3">
                <input
                  className="input flex-1"
                  value={input}
                  onChange={(e) => setInput(e.target.value.slice(0, 40))}
                  placeholder={`${guesserName}, type your guess`}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") submitGuess();
                  }}
                />
                <button className="btn-primary !px-4" onClick={submitGuess}>
                  Guess
                </button>
              </div>
              <button className="btn-ghost !py-2 mt-2 text-xs" onClick={() => endRound(false)}>
                Give up
              </button>
            </div>
          </div>
        </div>
      )}

      {stage === "round-end" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="py-4">
          <div className="grid md:grid-cols-2 gap-6 items-center">
            {snap && <img src={snap} alt="The masterpiece" className="rounded-2xl border border-coral/20 shadow-warm w-full" />}
            <div className="text-center md:text-left">
              <div className="text-plum-soft text-sm uppercase tracking-widest">{guessedThis ? "Nailed it!" : "Time's up!"}</div>
              <div className="heading-serif text-4xl text-plum mt-2 capitalize">{word}</div>
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between card p-3 bg-white/70 text-sm">
                  <span className="text-plum-soft">{guesserName} · guesser</span>
                  <b className={guessedThis ? "text-coral" : "text-plum-soft"}>{guessedThis ? "+10" : "0"}</b>
                </div>
                <div className="flex items-center justify-between card p-3 bg-white/70 text-sm">
                  <span className="text-plum-soft">{drawerName} · artist</span>
                  <b className={guessedThis ? "text-coral" : "text-plum-soft"}>{guessedThis ? "+5" : "0"}</b>
                </div>
              </div>
              <div className="text-sm text-plum-soft mt-3">
                {names.a} {scores[0]} · {scores[1]} {names.b}
              </div>
              <button
                className="btn-primary mt-5 w-full md:w-auto"
                onClick={() => {
                  if (round + 1 >= totalRounds) setStage("done");
                  else {
                    setRound((r) => r + 1);
                    setStage("reveal-artist");
                    setPeeked(false);
                  }
                }}
              >
                {round + 1 >= totalRounds ? "See final score" : "Next turn"} <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

/* ================= ONLINE — synced across devices ================= */

interface DdState {
  round?: number;
  totalRounds?: number;
  roundPhase?: "idle" | "drawing" | "reveal" | "done";
  artistId?: string | null;
  timerEnd?: number | null;
  guesses?: { id: string; by: "host" | "guest"; text: string }[];
  scores?: { host: number; guest: number };
  revealedWord?: string | null;
  winnerRole?: "host" | "guest" | null;
  strokes?: Stroke[];
}

function DdOnline({ room, peers, broadcast, onBroadcast, refresh, onExit }: OnlineGameProps) {
  const myPid = getPlayerId();
  const role = room.role === "guest" ? "guest" : "host";
  const state = (room.state ?? {}) as DdState;
  const round = state.round ?? 0;
  const totalRounds = state.totalRounds ?? DOODLE_ROUNDS;
  const phase = state.roundPhase ?? "idle";
  const scores = state.scores ?? { host: 0, guest: 0 };
  const guesses = state.guesses ?? [];
  const isArtist = !!state.artistId && state.artistId === myPid;
  const artistRole: "host" | "guest" = state.artistId === room.hostId ? "host" : "guest";
  const artistName = state.artistId === room.hostId ? room.hostName ?? "Host" : room.guestName ?? "Guest";
  const guesserName = state.artistId === room.hostId ? room.guestName ?? "Guest" : room.hostName ?? "Host";
  const partnerPid = role === "host" ? room.guestId : room.hostId;
  const partnerOnline = !!(partnerPid && peers.includes(partnerPid));
  const artistOnline = !state.artistId || peers.includes(state.artistId);

  const deck = useMemo(() => seededShuffle(DOODLE_WORDS, totalRounds, seedOf(room.code)), [room.code, totalRounds]);

  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [liveGuesses, setLiveGuesses] = useState<{ id: string; by: "host" | "guest"; text: string }[]>([]);
  const [input, setInput] = useState("");
  const [tLeft, setTLeft] = useState(DOODLE_SECONDS);
  const [myWord, setMyWord] = useState<string | null>(null);
  const tools = useTools();
  const pointBuffer = useRef<{ id: string; pt: [number, number] }[]>([]);
  const persistTimer = useRef<number | null>(null);
  const mirror = useRef<DdState>({});
  mirror.current = { ...state };
  const ending = useRef(false);
  const seenGuessIds = useRef(new Set<string>());
  const liveGuessesRef = useRef(liveGuesses);
  liveGuessesRef.current = liveGuesses;
  const myWordRef = useRef(myWord);
  myWordRef.current = myWord;
  // single-flight write queue: every table write is sequenced so a debounced
  // strokes persist can never clobber a round-transition write
  const writeQ = useRef<Promise<unknown>>(Promise.resolve());
  const enqueue = useCallback((fn: () => Promise<unknown>) => {
    const p = writeQ.current.then(fn).catch(() => {});
    writeQ.current = p;
    return p;
  }, []);

  /* --- adopt persisted strokes when we (re)join mid-round --- */
  useEffect(() => {
    const persisted = state.strokes ?? [];
    if (persisted.length === 0 && phase !== "drawing") setStrokes([]);
    setStrokes((cur) => {
      if (!persisted.length) return cur;
      const known = new Set(cur.map((s) => s.id));
      const merged = [...cur];
      persisted.forEach((s) => {
        if (!known.has(s.id)) merged.push(s);
      });
      // peer may have undone — persisted list is authoritative for missing/extra
      const stillThere = new Set(persisted.map((s) => s.id));
      return round === (mirror.current.round ?? 0) ? merged.filter((s) => stillThere.has(s.id) || !persisted.length) : merged;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.strokes]);

  /* --- adopt persisted guesses (artist echoes them into state) --- */
  useEffect(() => {
    setLiveGuesses((cur) => {
      const byId = new Map(cur.map((g) => [g.id, g]));
      guesses.forEach((g) => byId.set(g.id, g));
      return [...byId.values()];
    });
  }, [guesses]);

  /* --- round changes reset local ephemera --- */
  useEffect(() => {
    setStrokes([]);
    setLiveGuesses([]);
    seenGuessIds.current = new Set();
    pointBuffer.current = [];
    setInput("");
    ending.current = false;
    setMyWord(null);
  }, [round, phase === "drawing"]);

  /* --- artist loads the secret word each round (private column) --- */
  useEffect(() => {
    if (!isArtist || phase !== "drawing") return;
    let alive = true;
    fetchRoomPrivate(room.code)
      .then((p) => {
        if (alive && typeof p.word === "string") setMyWord(p.word);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isArtist, round, phase]);

  /* --- live stroke broadcast wiring --- */
  useEffect(() => {
    if (!onBroadcast) return;
    const off1 = onBroadcast("doodle-stroke-add", (p) => {
      const stroke = p?.stroke as Stroke | undefined;
      if (!stroke) return;
      setStrokes((cur) => (cur.some((s) => s.id === stroke.id) ? cur : [...cur, stroke]));
    });
    const off2 = onBroadcast("doodle-stroke-points", (p) => {
      if (!p?.id || !Array.isArray(p.pts)) return;
      setStrokes((cur) => cur.map((s) => (s.id === p.id ? { ...s, points: [...s.points, ...(p.pts as [number, number][])] } : s)));
    });
    const off3 = onBroadcast("doodle-clear", () => setStrokes([]));
    const off4 = onBroadcast("doodle-undo", (p) => setStrokes((cur) => cur.filter((s) => s.id !== p?.id)));
    const off5 = onBroadcast("doodle-guess", (p) => {
      const g = p as { id: string; by: "host" | "guest"; text: string };
      if (!g?.id || seenGuessIds.current.has(g.id)) return;
      seenGuessIds.current.add(g.id);
      setLiveGuesses((cur) => (cur.some((x) => x.id === g.id) ? cur : [...cur, g]));
    });
    return () => {
      off1();
      off2();
      off3();
      off4();
      off5();
    };
  }, [onBroadcast]);

  const persistStrokes = useCallback(
    (next: Stroke[]) => {
      if (persistTimer.current) window.clearTimeout(persistTimer.current);
      persistTimer.current = window.setTimeout(() => {
        void enqueue(() => updateRoomState(room.code, mirror.current, { strokes: next }));
      }, 700);
    },
    [room.code, enqueue]
  );

  const flushPoints = useCallback(() => {
    const pts = pointBuffer.current;
    if (!pts.length) return;
    pointBuffer.current = [];
    const byId = new Map<string, [number, number][]>();
    pts.forEach((meta) => {
      const arr = byId.get(meta.id) ?? [];
      arr.push(meta.pt);
      byId.set(meta.id, arr);
    });
    byId.forEach((list, id) => void broadcast("doodle-stroke-points", { id, pts: list }));
  }, [broadcast]);

  useEffect(() => {
    if (!isArtist) return;
    const iv = window.setInterval(flushPoints, 150);
    return () => window.clearInterval(iv);
  }, [isArtist, flushPoints]);

  /* --- strokes: artist authoring --- */
  const onStrokeStart = (s: Stroke) => {
    const stroke: Stroke = { ...s, color: tools.erase ? "#000" : tools.color, size: tools.size, erase: tools.erase };
    setStrokes((cur) => {
      const next = [...cur, stroke];
      persistStrokes(next);
      return next;
    });
    void broadcast("doodle-stroke-add", { stroke });
  };
  const onStrokePoint = (id: string, pt: [number, number]) => {
    setStrokes((cur) => cur.map((s) => (s.id === id ? { ...s, points: [...s.points, pt] } : s)));
    pointBuffer.current.push({ id, pt });
  };
  const onStrokeEnd = (id: string) => {
    void id;
    flushPoints();
    setStrokes((cur) => {
      persistStrokes(cur);
      return cur;
    });
  };
  const clearCanvas = () => {
    setStrokes(() => {
      persistStrokes([]);
      return [];
    });
    void broadcast("doodle-clear");
  };
  const undoStroke = () => {
    setStrokes((cur) => {
      if (!cur.length) return cur;
      const last = cur[cur.length - 1];
      const next = cur.slice(0, -1);
      persistStrokes(next);
      void broadcast("doodle-undo", { id: last.id });
      return next;
    });
  };

  /* --- round orchestration --- */
  const startRound = async (roundNum: number) => {
    const artistId = roundNum % 2 === 1 ? room.hostId : room.guestId;
    const word = deck[roundNum - 1] ?? DOODLE_WORDS[0];
    await updateRoomState(room.code, mirror.current, {
      round: roundNum,
      totalRounds: DOODLE_ROUNDS,
      roundPhase: "drawing",
      artistId,
      timerEnd: Date.now() + DOODLE_SECONDS * 1000,
      guesses: [],
      strokes: [],
      revealedWord: null,
      winnerRole: null,
    });
    await updateRoomPrivate(room.code, { word });
    await broadcast("state-changed");
    await refresh();
  };

  const endRound = useCallback(
    (winnerRole: "host" | "guest" | null) => {
      if (ending.current) return;
      ending.current = true;
      void enqueue(async () => {
        try {
          // verify still drawing (avoid double-end races)
          const fresh = await fetchRoom(room.code);
          const fs = (fresh?.state ?? {}) as DdState;
          if (fs.roundPhase !== "drawing" || fs.round !== round) return;
          const nextScores = { ...(fs.scores ?? scores) };
          if (winnerRole) {
            nextScores[winnerRole] += 10;
            nextScores[artistRole] += 5;
          }
          await updateRoomState(room.code, fs, {
            roundPhase: "reveal",
            winnerRole,
            revealedWord: myWordRef.current ?? fs.revealedWord ?? null,
            scores: nextScores,
            guesses: liveGuessesRef.current,
          });
          await broadcast("state-changed");
          await refresh();
        } finally {
          ending.current = false;
        }
      });
    },
    [enqueue, room.code, round, artistRole, scores, broadcast, refresh]
  );

  /* --- timer --- */
  useEffect(() => {
    if (phase !== "drawing" || !state.timerEnd) return;
    const tick = () => {
      const left = Math.max(0, Math.ceil((state.timerEnd! - Date.now()) / 1000));
      setTLeft(left);
      if (left <= 0 && (isArtist || !artistOnline)) void endRound(null);
    };
    tick();
    const iv = setInterval(tick, 250);
    return () => clearInterval(iv);
  }, [phase, state.timerEnd, isArtist, artistOnline, endRound]);

  /* --- artist watches guesses for the winning answer --- */
  useEffect(() => {
    if (!isArtist || phase !== "drawing" || !myWord) return;
    const target = norm(myWord);
    const hit = liveGuesses.find((g) => g.by !== artistRole && norm(g.text) === target);
    if (hit) endRound(hit.by);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveGuesses, isArtist, phase, myWord, artistRole]);

  const submitGuess = async () => {
    const v = input.trim();
    if (!v || isArtist) return;
    const g = { id: strokeId(), by: role as "host" | "guest", text: v };
    setInput("");
    seenGuessIds.current.add(g.id);
    setLiveGuesses((cur) => [...cur, g]);
    await broadcast("doodle-guess", g);
  };

  const resetGame = async () => {
    await updateRoomState(room.code, mirror.current, {
      round: 0,
      scores: { host: 0, guest: 0 },
      roundPhase: "idle",
      guesses: [],
      strokes: [],
      artistId: null,
      timerEnd: null,
      revealedWord: null,
      winnerRole: null,
    });
    await broadcast("state-changed");
    await refresh();
  };

  /* ============ screens ============ */

  if (phase === "idle" || !state.artistId) {
    return (
      <div className="card p-8 text-center shadow-warm">
        <span className="pill bg-blush text-coral-deep">
          <PencilLine className="w-3 h-3" /> Doodle Duel
        </span>
        <h2 className="heading-serif text-3xl text-plum mt-3">{DOODLE_ROUNDS} rounds · {DOODLE_SECONDS}s each</h2>
        <p className="text-plum-soft mt-2">Take turns doodling. Sixty seconds to make each other laugh.</p>
        {!partnerOnline && <WaitingNote>Your partner isn't connected — the duel begins when you're both here.</WaitingNote>}
        {role === "host" ? (
          <button className="btn-primary mt-6" onClick={() => startRound(1)} disabled={!partnerOnline}>
            Start round 1
          </button>
        ) : (
          <WaitingNote>Waiting for {room.hostName} to start…</WaitingNote>
        )}
      </div>
    );
  }

  if (phase === "done") {
    const winner = scores.host === scores.guest ? "tie" : scores.host > scores.guest ? "host" : "guest";
    return (
      <div className="card p-8 text-center shadow-warm relative">
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[28px]">
          <HeartBurst count={16} seed={31} />
        </div>
        <div className="relative">
          <Trophy className="w-14 h-14 text-coral mx-auto" />
          <h2 className="heading-serif text-4xl text-plum mt-3">
            {winner === "tie" ? "It's a tie!" : `${winner === "host" ? room.hostName : room.guestName} wins!`}
          </h2>
          <div className="heading-serif text-6xl text-coral mt-4">
            {scores.host} – {scores.guest}
          </div>
          <div className="text-sm text-plum-soft mt-1">
            {room.hostName} · {room.guestName}
          </div>
          {strokes.length > 0 && (
            <div className="mt-6 max-w-md mx-auto">
              <div className="text-xs uppercase tracking-widest text-plum-soft mb-2">Last masterpiece</div>
              <SnapshotView strokes={strokes} />
            </div>
          )}
          <div className="flex justify-center gap-3 mt-7 flex-wrap">
            <button className="btn-primary" onClick={() => void resetGame()}>
              <RotateCcw className="w-4 h-4" /> Play again
            </button>
            <button className="btn-ghost" onClick={() => void onExit()}>
              <ArrowLeft className="w-4 h-4" /> Games
            </button>
          </div>
        </div>
      </div>
    );
  }

  const wordShown = isArtist ? myWord : null;
  const displayGuesses = [...liveGuesses].sort((a, b) => a.id.localeCompare(b.id));

  return (
    <div className="card p-5 md:p-6 shadow-warm">
      <RoundHeader
        pill="Doodle Duel"
        icon={<PencilLine className="w-3 h-3" />}
        right={
          <>
            Round {round} of {totalRounds} · {room.hostName} {scores.host} · {scores.guest} {room.guestName}
          </>
        }
      />

      {phase === "drawing" && (
        <div className="grid md:grid-cols-[1fr_320px] gap-5">
          <div>
            <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
              <div className="text-sm text-plum-soft">
                {isArtist ? "You are drawing" : `${artistName} is drawing`}
                {wordShown && (
                  <span className="ml-2 pill bg-coral text-white capitalize">
                    <Eye className="w-3 h-3" /> {wordShown}
                  </span>
                )}
                {!isArtist && !artistOnline && <span className="ml-2 pill bg-rose/40 text-plum">artist stepped away</span>}
              </div>
              <TimerPill tLeft={tLeft} />
            </div>
            {isArtist && !wordShown && (
              <div className="mb-2 text-xs text-plum-soft italic flex items-center gap-2">
                <TimerReset className="w-3.5 h-3.5 spin-slow" /> Fetching your secret word…
              </div>
            )}
            <DoodleCanvas
              readOnly={!isArtist}
              strokes={strokes}
              onStrokeStart={isArtist ? onStrokeStart : undefined}
              onStrokePoint={isArtist ? onStrokePoint : undefined}
              onStrokeEnd={isArtist ? onStrokeEnd : undefined}
            />
            {isArtist && <Toolbar {...tools} canUndo={strokes.length > 0} onUndo={undoStroke} onClear={clearCanvas} />}
          </div>
          <div className="flex flex-col">
            <div className="text-sm text-plum-soft mb-2">{isArtist ? `${guesserName} is guessing` : "Type your guess"}</div>
            <div className="card p-3 bg-white/70 flex-1 flex flex-col min-h-[220px]">
              <div className="flex-1 overflow-y-auto space-y-2 max-h-[280px]">
                {displayGuesses.length === 0 && <div className="text-sm text-plum-soft italic">No guesses yet…</div>}
                {displayGuesses.map((g) => {
                  const who = g.by === "host" ? room.hostName : room.guestName;
                  return (
                    <div key={g.id} className="text-sm px-3 py-2 rounded-xl bg-blush/50 text-plum">
                      <span className="text-plum-soft text-xs mr-2">{who}:</span>
                      {g.text}
                    </div>
                  );
                })}
              </div>
              {!isArtist && (
                <div className="flex gap-2 mt-3">
                  <input
                    className="input flex-1"
                    value={input}
                    onChange={(e) => setInput(e.target.value.slice(0, 40))}
                    placeholder="Your guess"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void submitGuess();
                    }}
                  />
                  <button className="btn-primary !px-4" onClick={() => void submitGuess()}>
                    Guess
                  </button>
                </div>
              )}
              {(isArtist || !artistOnline) && (
                <button className="btn-ghost !py-2 mt-2 text-xs" onClick={() => endRound(null)}>
                  End round early
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {phase === "reveal" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="py-4">
          <div className="grid md:grid-cols-2 gap-6 items-center">
            {strokes.length > 0 ? (
              <SnapshotView strokes={strokes} />
            ) : (
              <div className="rounded-2xl border border-coral/15 bg-white/60 aspect-[4/3] grid place-items-center text-plum-soft italic text-sm">
                the canvas was blank — bold choice
              </div>
            )}
            <div className="text-center md:text-left">
              <div className="text-plum-soft text-sm uppercase tracking-widest">The word was</div>
              <div className="heading-serif text-4xl text-plum mt-2 capitalize">{state.revealedWord || "—"}</div>
              <div className="mt-2 text-plum-soft">
                {state.winnerRole ? (
                  <span>
                    <b className="text-plum">{state.winnerRole === "host" ? room.hostName : room.guestName}</b> got it!{" "}
                    <span className="text-coral font-semibold">+10</span> for them, <span className="text-coral font-semibold">+5</span> for the artist.
                  </span>
                ) : (
                  "Time's up! No one guessed it."
                )}
              </div>
              <div className="text-sm text-plum-soft mt-3">
                {room.hostName} {scores.host} · {scores.guest} {room.guestName}
              </div>
              {round >= totalRounds ? (
                <button
                  className="btn-primary mt-5"
                  onClick={async () => {
                    await updateRoomState(room.code, mirror.current, { roundPhase: "done" });
                    await broadcast("state-changed");
                    await refresh();
                  }}
                >
                  See final score <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <>
                  {role === "host" ? (
                    <button className="btn-primary mt-5" onClick={() => startRound(round + 1)}>
                      Next round <ArrowRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <WaitingNote>Waiting for {room.hostName}…</WaitingNote>
                  )}
                </>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function SnapshotView({ strokes }: { strokes: Stroke[] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    cv.width = 800;
    cv.height = 600;
    paintAll(cv, strokes);
  }, [strokes]);
  return <canvas ref={ref} className="w-full rounded-2xl border border-coral/20 shadow-warm bg-white" />;
}
