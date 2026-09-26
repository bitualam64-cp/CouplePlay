import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Home } from "lucide-react";
import Layout from "../ui/Layout";
import GameGrid from "../ui/GameGrid";

export default function LocalHub() {
  return (
    <Layout
      right={
        <Link to="/" className="btn-ghost text-sm">
          <Home className="w-4 h-4" /> Home
        </Link>
      }
    >
      <div className="max-w-6xl mx-auto px-5 md:px-8 pt-6 pb-10">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <span className="pill bg-blush text-coral-deep">Local Play</span>
          <h1 className="heading-serif text-4xl md:text-5xl mt-3 text-plum">Pick a game, pass the phone.</h1>
          <p className="text-plum-soft mt-2 max-w-xl">
            All five games work on a single device. Take turns, keep score, and make each other laugh.
          </p>
        </motion.div>
        <div className="mt-8">
          <GameGrid basePath="/local" />
        </div>
      </div>
    </Layout>
  );
}
