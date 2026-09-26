import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Brain, Heart, RotateCcw, Trophy } from "lucide-react";
import { NameGate, TurnPass, WaitingNote, RoundHeader } from "../ui/common";
import { HeartBurst } from "../ui/bits";
import { answerPoints, pointsTone, seededShuffle, seedOf } from "../lib/util";
import { WHOKNOWS_QUESTIONS, WHOKNOWS_ROUNDS } from "../lib/content";
import { fetchRoom, updateRoomState } from "../lib/rtc";
import type { OnlineGameProps } from "../pages/Room";

export type GameProps = { mode: "local"; onExit: () => void } | OnlineGameProps;

export default function WhoKnows(props: GameProps) {
  return props.mode === "local" ? <WkLocal {...props} /> : <WkOnline {...props} />;
}

/* ================= local ================= */

function WkLocal({ onExit }: { onExit: () => void }) {
  const [names, setNames] = useState({ a: "", b: "" });
  const [setup, setSetup] = useState(true);
  const [round, setRound] = useState(0);
  const [questions] = useState(() => seededShuffle(WHOKNOWS_QUESTIONS, WHOKNOWS_ROUNDS));
  const [stage, setStage] = useState<"answer" | "pass" | "guess" | "reveal">("answer");
  const [answer, setAnswer] = useState("");
  const [guess, setGuess] = useState("");
  const [lastPts, setLastPts] = useState(0);
  const [scores, setScores] = useState<[number, number]>([0, 0]);
  const [done, setDone] = useState(false);

  if (setup)
    return (
      <NameGate
        pill="Who Knows Who?"
        title="Two names, please."
        names={names}
        setNames={setNames}
        onBack={onExit}
        onStart={() => setSetup(false)}
      />
    );

  if (done) {
    const winner = scores[0] === scores[1] ? "tie" : scores[0] > scores[1] ? "a" : "b";
    return (
      <div className="card p-8 text-center shadow-warm relative">
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[28px]">
          <HeartBurst count={14} seed={4} />
        </div>
        <div className="relative">
          <Trophy className="w-14 h-14 text-coral mx-auto" />
          <h2 className="heading-serif text-4xl text-plum mt-3">
            {winner === "tie" ? "It's a tie!" : `${winner === "a" ? names.a : names.b} knows best`}
          </h2>
          <div className="heading-serif text-5xl text-coral mt-4">
            {scores[0]} – {scores[1]}
          </div>
          <div className="text-sm text-plum-soft mt-1">
            {names.a} · {names.b}
          </div>
          <div className="flex justify-center gap-3 mt-6 flex-wrap">
            <button
              className="btn-primary"
              onClick={() => {
                setRound(0);
                setScores([0, 0]);
                setStage("answer");
                setDone(false);
                setAnswer("");
                setGuess("");
              }}
            >
              <RotateCcw className="w-4 h-4" /> Play again
            </button>
            <button className="btn-ghost" onClick={onExit}>
              <ArrowLeft className="w-4 h-4" /> Games
            </button>
          </div>
        </div>
      </div>
    );
  }

  const targetSide = round % 2 === 0 ? "a" : "b";
  const guesserSide = targetSide === "a" ? "b" : "a";
  const target = targetSide === "a" ? names.a || "Player 1" : names.b || "Player 2";
  const guesser = guesserSide === "a" ? names.a || "Player 1" : names.b || "Player 2";
  const q = questions[round];
  const tone = pointsTone(lastPts);

  return (
    <div className="card p-6 md:p-8 shadow-warm">
      <RoundHeader pill="Who Knows Who?" icon={<Brain className="w-3 h-3" />} right={<>Round {round + 1} of {questions.length}</>} />
      <AnimatePresence mode="wait">
        {stage === "answer" && (
          <motion.div key="answer" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="text-plum-soft text-sm uppercase tracking-widest">Question about {target}</div>
            <h3 className="heading-serif text-3xl text-plum mt-2 leading-tight">{q}</h3>
            <p className="text-sm text-plum-soft mt-3">
              <b className="text-plum">{target}</b> — answer honestly (hidden from partner).
            </p>
            <input
              className="input mt-3"
              value={answer}
              onChange={(e) => setAnswer(e.target.value.slice(0, 80))}
              placeholder="Your honest answer"
              onKeyDown={(e) => {
                if (e.key === "Enter" && answer.trim()) setStage("pass");
              }}
            />
            <button className="btn-primary mt-4 w-full" disabled={!answer.trim()} onClick={() => setStage("pass")}>
              Lock answer
            </button>
          </motion.div>
        )}
        {stage === "pass" && (
          <motion.div key="pass" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <TurnPass to={guesser} note={`${target} locked in their answer. Time to prove you know them.`} action="I'm ready" onDone={() => setStage("guess")} />
          </motion.div>
        )}
        {stage === "guess" && (
          <motion.div key="guess" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="text-plum-soft text-sm uppercase tracking-widest">Question about {target}</div>
            <h3 className="heading-serif text-3xl text-plum mt-2 leading-tight">{q}</h3>
            <p className="text-sm text-plum-soft mt-3">
              <b className="text-plum">{guesser}</b> — guess {target}'s answer.
            </p>
            <input
              className="input mt-3"
              value={guess}
              onChange={(e) => setGuess(e.target.value.slice(0, 80))}
              placeholder={`Guess ${target}'s answer`}
              onKeyDown={(e) => {
                if (e.key === "Enter" && guess.trim()) submitLocalGuess();
              }}
            />
            <button className="btn-primary mt-4 w-full" disabled={!guess.trim()} onClick={submitLocalGuess}>
              Reveal <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        )}
        {stage === "reveal" && (
          <motion.div key="reveal" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <WkRevealCards targetName={target} guesserName={guesser} targetText={answer} guessText={guess} pts={lastPts} tone={tone} />
            <button
              className="btn-primary mt-5 w-full"
              onClick={() => {
                if (round + 1 >= questions.length) setDone(true);
                else {
                  setRound((r) => r + 1);
                  setStage("answer");
                  setAnswer("");
                  setGuess("");
                }
              }}
            >
              {round + 1 >= questions.length ? "See final score" : "Next round"} <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  function submitLocalGuess() {
    if (!guess.trim()) return;
    const pts = answerPoints(answer, guess);
    setLastPts(pts);
    const gi = guesserSide === "a" ? 0 : 1;
    setScores((s) => {
      const next: [number, number] = [...s];
      next[gi] += pts;
      return next;
    });
    setStage("reveal");
  }
}

import { AnimatePresence } from "framer-motion";

function WkRevealCards({
  targetName,
  guesserName,
  targetText,
  guessText,
  pts,
  tone,
}: {
  targetName: string;
  guesserName: string;
  targetText: string;
  guessText: string;
  pts: number;
  tone: { text: string; tone: string };
}) {
  return (
    <div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="card p-5 bg-white/60 border-dashed">
          <div className="text-xs uppercase tracking-widest text-plum-soft">{targetName}'s truth</div>
          <div className="heading-serif text-xl text-plum mt-1.5">{targetText}</div>
        </div>
        <div className="card p-5 bg-white/80">
          <div className="text-xs uppercase tracking-widest text-plum-soft">{guesserName} guessed</div>
          <div className="heading-serif text-xl text-plum mt-1.5">{guessText}</div>
        </div>
      </div>
      <div className={`mt-4 rounded-2xl p-5 text-center ${tone.tone}`}>
        <div className="heading-serif text-2xl flex items-center justify-center gap-2">
          {pts === 10 && <Heart className="w-5 h-5 text-coral fill-coral" />}
          {tone.text}
          {pts > 0 && <span className="text-base font-sans font-semibold">+{pts} for the guesser</span>}
        </div>
      </div>
    </div>
  );
}

/* ================= online ================= */

interface WkState {
  round?: number;
  scores?: { host: number; guest: number };
  submissions?: { host?: { text: string }; guest?: { text: string } };
  stage?: "collect" | "reveal";
  lastPts?: number;
  lastTarget?: string;
  lastGuess?: string;
  done?: boolean;
}

function WkOnline({ room, broadcast, refresh, onExit }: OnlineGameProps) {
  const role = room.role === "guest" ? "guest" : "host";
  const state = (room.state ?? {}) as WkState;
  const round = state.round ?? 0;
  const scores = state.scores ?? { host: 0, guest: 0 };
  const subs = state.submissions ?? {};
  const stage = state.stage ?? "collect";
  const done = !!state.done;
  const questions = useMemo(() => seededShuffle(WHOKNOWS_QUESTIONS, WHOKNOWS_ROUNDS, seedOf(room.code)), [room.code]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const advancing = useRef(false);

  const hostName = room.hostName ?? "Host";
  const guestName = room.guestName ?? "Guest";
  const answererRole = round % 2 === 0 ? "host" : "guest";
  const guesserRole = answererRole === "host" ? "guest" : "host";
  const answererName = answererRole === "host" ? hostName : guestName;
  const guesserName = guesserRole === "host" ? hostName : guestName;
  const iAmAnswerer = role === answererRole;
  const q = questions[Math.min(round, questions.length - 1)];
  const bothIn = !!(subs.host && subs.guest);

  // host settles the round once both submissions exist
  useEffect(() => {
    if (role !== "host" || stage !== "collect" || !bothIn || advancing.current) return;
    advancing.current = true;
    (async () => {
      const a = subs[answererRole]?.text ?? "";
      const g = subs[guesserRole]?.text ?? "";
      const pts = answerPoints(a, g);
      const nextScores = { ...scores, [guesserRole]: (scores as any)[guesserRole] + pts };
      await updateRoomState(room.code, room.state, {
        stage: "reveal",
        scores: nextScores,
        lastPts: pts,
        lastTarget: a,
        lastGuess: g,
      });
      await broadcast("state-changed");
      await refresh();
      advancing.current = false;
    })().catch(() => {
      advancing.current = false;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, stage, bothIn]);

  if (done) {
    const winner = scores.host === scores.guest ? "tie" : scores.host > scores.guest ? "host" : "guest";
    return (
      <div className="card p-8 text-center shadow-warm relative">
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[28px]">
          <HeartBurst count={14} seed={4} />
        </div>
        <div className="relative">
          <Trophy className="w-14 h-14 text-coral mx-auto" />
          <h2 className="heading-serif text-4xl text-plum mt-3">
            {winner === "tie" ? "It's a tie!" : `${winner === "host" ? hostName : guestName} knows best`}
          </h2>
          <div className="heading-serif text-5xl text-coral mt-4">
            {scores.host} – {scores.guest}
          </div>
          <div className="text-sm text-plum-soft mt-1">
            {hostName} · {guestName}
          </div>
          <div className="flex justify-center gap-3 mt-6 flex-wrap">
            <button
              className="btn-primary"
              onClick={async () => {
                await updateRoomState(room.code, room.state, {
                  round: 0,
                  scores: { host: 0, guest: 0 },
                  submissions: {},
                  stage: "collect",
                  done: false,
                  lastPts: undefined,
                  lastTarget: undefined,
                  lastGuess: undefined,
                });
                await broadcast("state-changed");
                await refresh();
              }}
            >
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

  const submit = async () => {
    const v = text.trim();
    if (!v) return;
    setSending(true);
    try {
      await updateRoomState(room.code, room.state, { submissions: { ...subs, [role]: { text: v } } });
      await broadcast("state-changed");
      await refresh();
      setText("");
    } finally {
      setSending(false);
    }
  };

  const next = async () => {
    const fresh = await fetchRoom(room.code);
    const fs = (fresh?.state ?? {}) as WkState;
    if ((fs.round ?? 0) !== round || fs.stage !== "reveal") return;
    const isLast = round + 1 >= questions.length;
    await updateRoomState(room.code, room.state, {
      round: round + 1,
      submissions: {},
      stage: "collect",
      done: isLast,
    });
    await broadcast("state-changed");
    await refresh();
  };

  return (
    <div className="card p-5 md:p-6 shadow-warm">
      <RoundHeader
        pill="Who Knows Who?"
        icon={<Brain className="w-3 h-3" />}
        right={
          <>
            Round {round + 1} of {questions.length} · {hostName} {scores.host} · {scores.guest} {guestName}
          </>
        }
      />
      <AnimatePresence mode="wait">
        {stage === "reveal" ? (
          <motion.div key="reveal" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <WkRevealCards
              targetName={answererName}
              guesserName={guesserName}
              targetText={state.lastTarget ?? ""}
              guessText={state.lastGuess ?? ""}
              pts={state.lastPts ?? 0}
              tone={pointsTone(state.lastPts ?? 0)}
            />
            <button className="btn-primary mt-5 w-full" onClick={() => void next()}>
              {round + 1 >= questions.length ? "See final score" : "Next round"} <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        ) : (
          <motion.div key="collect" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="text-plum-soft text-sm uppercase tracking-widest">Question about {answererName}</div>
            <h3 className="heading-serif text-3xl text-plum mt-2 leading-tight">{q}</h3>
            {iAmAnswerer ? (
              subs[role] ? (
                <WaitingNote>
                  Answer locked. <b className="text-plum not-italic">{guesserName}</b> is guessing…
                </WaitingNote>
              ) : (
                <>
                  <p className="text-sm text-plum-soft mt-3">Answer honestly — it's hidden until they guess.</p>
                  <div className="flex gap-2 mt-3 flex-wrap">
                    <input
                      className="input flex-1 min-w-[200px]"
                      value={text}
                      onChange={(e) => setText(e.target.value.slice(0, 80))}
                      placeholder="Your honest answer"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void submit();
                      }}
                    />
                    <button className="btn-primary !px-5" disabled={sending || !text.trim()} onClick={() => void submit()}>
                      Lock
                    </button>
                  </div>
                </>
              )
            ) : !subs[answererRole] ? (
              <WaitingNote>
                <b className="text-plum not-italic">{answererName}</b> is writing their honest answer…
              </WaitingNote>
            ) : subs[role] ? (
              <WaitingNote>Guess locked. Together at last — one moment…</WaitingNote>
            ) : (
              <>
                <p className="text-sm text-plum-soft mt-3">
                  {answererName} answered in secret. What did they say?
                </p>
                <div className="flex gap-2 mt-3 flex-wrap">
                  <input
                    className="input flex-1 min-w-[200px]"
                    value={text}
                    onChange={(e) => setText(e.target.value.slice(0, 80))}
                    placeholder={`Guess ${answererName}'s answer`}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void submit();
                    }}
                  />
                  <button className="btn-primary !px-5" disabled={sending || !text.trim()} onClick={() => void submit()}>
                    Reveal
                  </button>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
