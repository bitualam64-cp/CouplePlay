import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Check, Copy, Home, LogOut, Users, Wifi, WifiOff } from "lucide-react";
import Layout from "../ui/Layout";
import GameGrid from "../ui/GameGrid";
import { PlayerChip } from "../ui/bits";
import LoveMatch from "../games/LoveMatch";
import DoodleDuel from "../games/DoodleDuel";
import WhoKnows from "../games/WhoKnows";
import MostLikely from "../games/MostLikely";
import ThisOrThat from "../games/ThisOrThat";
import { exitRoomGame, getPlayerId, getSavedName, joinRoom, saveName, setRoomGame, useRoom, type Room } from "../lib/rtc";

export default function RoomPage() {
  const { code = "" } = useParams();
  const roomCode = code.toUpperCase();
  const { room, error, loading, broadcast, onBroadcast, refresh, peers, connected } = useRoom(roomCode);
  const navigate = useNavigate();
  const [observerMode, setObserverMode] = useState(false);
  const [joinName, setJoinName] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const myPid = getPlayerId();

  useEffect(() => {
    setJoinName(getSavedName());
  }, []);

  useEffect(() => {
    if (room) setObserverMode(room.role === "observer");
  }, [room?.role]); // eslint-disable-line react-hooks/exhaustive-deps

  const copyInvite = async () => {
    const url = `${location.origin}/room/${roomCode}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Join me on CouplePlay", text: `Room code: ${roomCode}`, url });
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      }
    } catch {
      /* user cancelled share sheet */
    }
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked */
    }
  };

  const onJoin = async () => {
    setJoinError(null);
    if (!joinName.trim()) return setJoinError("Please enter your name.");
    setJoining(true);
    try {
      saveName(joinName.trim());
      await joinRoom(roomCode, joinName.trim());
      await refresh();
      await broadcast("state-changed");
    } catch (e) {
      setJoinError(e instanceof Error ? e.message : "Could not join");
    } finally {
      setJoining(false);
    }
  };

  const pickGame = async (game: string) => {
    await setRoomGame(roomCode, game);
    await broadcast("state-changed");
    await refresh();
  };

  const exitGame = async () => {
    await exitRoomGame(roomCode);
    await broadcast("state-changed");
    await refresh();
  };

  if (loading && !room) {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto px-5 pt-16 text-center text-plum-soft">Loading room…</div>
      </Layout>
    );
  }

  if (error || !room) {
    return (
      <Layout
        right={
          <Link to="/" className="btn-ghost text-sm">
            <Home className="w-4 h-4" /> Home
          </Link>
        }
      >
        <div className="max-w-md mx-auto px-5 pt-16">
          <div className="card p-8 text-center">
            <h2 className="heading-serif text-2xl text-plum">Room not found</h2>
            <p className="text-plum-soft mt-2">
              The code <b>{roomCode}</b> doesn't match any active room.
            </p>
            <Link to="/online" className="btn-primary mt-6 inline-flex">
              Try again
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  if (observerMode && room.guestId && room.hostId !== myPid && room.guestId !== myPid) {
    return (
      <Layout
        right={
          <Link to="/" className="btn-ghost text-sm">
            <Home className="w-4 h-4" /> Home
          </Link>
        }
      >
        <div className="max-w-md mx-auto px-5 pt-16">
          <div className="card p-8 text-center">
            <h2 className="heading-serif text-2xl text-plum">This room is full</h2>
            <p className="text-plum-soft mt-2">Rooms are for two. Create your own and invite someone special.</p>
            <Link to="/online" className="btn-primary mt-6 inline-flex">
              Create a room
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  if (observerMode) {
    return (
      <Layout
        right={
          <Link to="/" className="btn-ghost text-sm">
            <Home className="w-4 h-4" /> Home
          </Link>
        }
      >
        <div className="max-w-md mx-auto px-5 pt-10">
          <div className="card p-8 shadow-warm">
            <span className="pill bg-blush text-coral-deep">You've been invited</span>
            <h2 className="heading-serif text-3xl text-plum mt-3">
              {room.hostName ? `${room.hostName} is waiting for you.` : "Hop in!"}
            </h2>
            <p className="text-plum-soft mt-2">
              Enter your name to join room <b className="tracking-widest text-plum">{roomCode}</b>.
            </p>
            <div className="mt-6 space-y-4">
              <input
                className="input"
                value={joinName}
                onChange={(e) => setJoinName(e.target.value.slice(0, 20))}
                placeholder="Your name"
                maxLength={20}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void onJoin();
                }}
              />
              <button className="btn-primary w-full py-3" onClick={() => void onJoin()} disabled={joining}>
                {joining ? "Joining…" : "Join the room"}
              </button>
              {joinError && <div className="text-sm text-coral-deep bg-coral/10 rounded-xl p-3">{joinError}</div>}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  const partnerPid = room.role === "host" ? room.guestId : room.hostId;
  const partnerOnline = !!(partnerPid && peers.includes(partnerPid));
  const bothJoined = !!(room.hostName && room.guestName);

  const headerRight = (
    <div className="flex items-center gap-2">
      <div className="pill bg-white/60 text-plum-soft border border-coral/15">
        {partnerOnline ? <Wifi className="w-3 h-3 text-mint" /> : <WifiOff className="w-3 h-3 text-rose" />}
        {partnerOnline ? "Both online" : "Waiting…"}
      </div>
      <button onClick={copyCode} className="btn-ghost text-xs !py-2 !px-3" title="Copy code">
        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        <span className="font-mono tracking-[0.3em]">{roomCode}</span>
      </button>
    </div>
  );

  const gameProps: OnlineGameProps = {
    mode: "online",
    room,
    peers,
    connected,
    broadcast,
    onBroadcast,
    refresh,
    onExit: exitGame,
  };

  return (
    <Layout right={headerRight}>
      <div className="max-w-5xl mx-auto px-5 md:px-8 pt-4 pb-10">
        <AnimatePresence mode="wait">
          {room.phase === "lobby" || !room.game ? (
            <motion.div key="lobby" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="card p-6 md:p-7 shadow-warm mb-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <span className="pill bg-blush text-coral-deep">
                      <Users className="w-3 h-3" /> Room {roomCode}
                    </span>
                    <h2 className="heading-serif text-3xl text-plum mt-2">Your cozy little lobby</h2>
                    <p className="text-plum-soft text-sm mt-1">Share the code, then pick a game together.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <PlayerChip name={room.hostName || "Host"} online={!!(room.hostId && peers.includes(room.hostId))} you={room.role === "host"} />
                    <span className="heading-serif text-2xl text-coral">&</span>
                    <PlayerChip
                      name={room.guestName || "Waiting…"}
                      online={!!(room.guestId && peers.includes(room.guestId))}
                      you={room.role === "guest"}
                      muted={!room.guestName}
                    />
                  </div>
                </div>
                <div className="mt-5 flex flex-wrap items-center gap-2">
                  <button className="btn-primary text-sm !py-2.5" onClick={copyInvite}>
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? "Copied!" : "Copy invite link"}
                  </button>
                  <span className="text-xs text-plum-soft">
                    or send them the code <b className="tracking-widest text-plum">{roomCode}</b>
                  </span>
                </div>
              </div>

              {bothJoined ? (
                <>
                  <div className="mb-3 heading-serif text-plum text-lg">Pick a game</div>
                  <GameGrid basePath="room" code={roomCode} onPick={(slug) => void pickGame(slug)} />
                </>
              ) : (
                <div className="card p-8 text-center">
                  <div className="heading-serif text-2xl text-plum">Almost ready…</div>
                  <p className="text-plum-soft mt-2">Games unlock the moment your partner joins the room.</p>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key={`game-${room.game}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <div className="mb-4 flex items-center justify-between">
                <button onClick={() => void exitGame()} className="btn-ghost text-sm">
                  <ArrowLeft className="w-4 h-4" /> Games
                </button>
                <button onClick={() => navigate("/")} className="btn-ghost text-sm" title="Leave room">
                  <LogOut className="w-4 h-4" /> Leave
                </button>
              </div>
              {room.game === "love-match" && <LoveMatch {...gameProps} />}
              {room.game === "doodle-duel" && <DoodleDuel {...gameProps} />}
              {room.game === "who-knows" && <WhoKnows {...gameProps} />}
              {room.game === "most-likely" && <MostLikely {...gameProps} />}
              {room.game === "this-or-that" && <ThisOrThat {...gameProps} />}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
}

export interface OnlineGameProps {
  mode: "online";
  room: Room;
  peers: string[];
  connected: boolean;
  broadcast: (event: string, payload?: any) => Promise<void>;
  onBroadcast: (event: string, cb: (payload: any) => void) => () => void;
  refresh: () => Promise<void>;
  onExit: () => void;
}
