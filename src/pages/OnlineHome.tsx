import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Home, Wifi, Plus, LogIn } from "lucide-react";
import Layout from "../ui/Layout";
import { createRoom, joinRoom, getSavedName, saveName } from "../lib/rtc";

export default function OnlineHome() {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<"create" | "join" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const [params] = useSearchParams();

  useEffect(() => {
    setName(getSavedName());
    const pre = params.get("code");
    if (pre) setCode(pre.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5));
  }, [params]);

  const onCreate = async () => {
    setError(null);
    if (!name.trim()) return setError("Please enter your name first.");
    setBusy("create");
    try {
      saveName(name.trim());
      const newCode = await createRoom(name.trim());
      navigate(`/room/${newCode}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create room");
    } finally {
      setBusy(null);
    }
  };

  const onJoin = async () => {
    setError(null);
    if (!name.trim()) return setError("Please enter your name first.");
    if (!code.trim()) return setError("Please enter a room code.");
    setBusy("join");
    try {
      saveName(name.trim());
      const room = await joinRoom(code.trim().toUpperCase(), name.trim());
      navigate(`/room/${room.code}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not join room");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Layout
      right={
        <Link to="/" className="btn-ghost text-sm">
          <Home className="w-4 h-4" /> Home
        </Link>
      }
    >
      <div className="max-w-lg mx-auto px-5 md:px-8 pt-6 pb-10">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <span className="pill bg-coral/15 text-coral-deep">
            <Wifi className="w-3 h-3" /> Online Play
          </span>
          <h1 className="heading-serif text-4xl md:text-5xl mt-3 text-plum">Play together, anywhere.</h1>
          <p className="text-plum-soft mt-2">Create a private room or join with a code your partner sent you.</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card p-6 md:p-7 mt-8 shadow-warm space-y-5"
        >
          <div>
            <label className="text-xs font-semibold text-plum-soft uppercase tracking-wider">Your name</label>
            <input
              className="input mt-1.5"
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 20))}
              placeholder="e.g. Alex"
              maxLength={20}
            />
          </div>
          <button onClick={onCreate} disabled={busy !== null} className="btn-primary w-full text-lg py-4">
            <Plus className="w-5 h-5" /> {busy === "create" ? "Creating…" : "Create a new room"}
          </button>
          <div className="relative flex items-center gap-3 text-xs text-plum-soft">
            <div className="flex-1 h-px bg-coral/20" /> or join a friend <div className="flex-1 h-px bg-coral/20" />
          </div>
          <div>
            <label className="text-xs font-semibold text-plum-soft uppercase tracking-wider">Room code</label>
            <input
              className="input mt-1.5 uppercase tracking-[0.35em] text-center text-lg font-semibold"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5))}
              placeholder="XXXXX"
              maxLength={5}
            />
          </div>
          <button onClick={onJoin} disabled={busy !== null} className="btn-ghost w-full text-base py-3">
            <LogIn className="w-4 h-4" /> {busy === "join" ? "Joining…" : "Join room"}
          </button>
          {error && <div className="text-sm text-coral-deep bg-coral/10 rounded-xl p-3">{error}</div>}
        </motion.div>
      </div>
    </Layout>
  );
}
