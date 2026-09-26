import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Layout from "../ui/Layout";
import LoveMatch from "../games/LoveMatch";
import DoodleDuel from "../games/DoodleDuel";
import WhoKnows from "../games/WhoKnows";
import MostLikely from "../games/MostLikely";
import ThisOrThat from "../games/ThisOrThat";

const SLUGS = ["love-match", "doodle-duel", "who-knows", "most-likely", "this-or-that"];

export default function LocalGame() {
  const { game } = useParams();
  const navigate = useNavigate();
  const onExit = () => navigate("/local");

  return (
    <Layout
      right={
        <Link to="/local" className="btn-ghost text-sm">
          <ArrowLeft className="w-4 h-4" /> Games
        </Link>
      }
    >
      <div className="max-w-4xl mx-auto px-5 md:px-8 pt-4 pb-10">
        {game === "love-match" && <LoveMatch mode="local" onExit={onExit} />}
        {game === "doodle-duel" && <DoodleDuel mode="local" onExit={onExit} />}
        {game === "who-knows" && <WhoKnows mode="local" onExit={onExit} />}
        {game === "most-likely" && <MostLikely mode="local" onExit={onExit} />}
        {game === "this-or-that" && <ThisOrThat mode="local" onExit={onExit} />}
        {!SLUGS.includes(game || "") && (
          <div className="card p-8 text-center">
            Unknown game.{" "}
            <Link className="text-coral font-semibold" to="/local">
              Back
            </Link>
          </div>
        )}
      </div>
    </Layout>
  );
}
