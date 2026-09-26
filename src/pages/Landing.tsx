import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, Sofa, Wifi } from "lucide-react";
import Layout from "../ui/Layout";

export default function Landing() {
  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-5 md:px-8 pt-8 md:pt-16 pb-10">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-center max-w-2xl mx-auto"
        >
          <span className="pill bg-blush text-coral-deep mb-5">
            <Sparkles className="w-3.5 h-3.5" /> playful mini-games for two
          </span>
          <h1 className="heading-serif text-5xl md:text-7xl leading-[1.05] text-plum">
            Fall in love,
            <br />
            <span className="italic text-coral">round</span> after <span className="italic text-coral">round</span>.
          </h1>
          <p className="text-plum-soft mt-6 text-lg leading-relaxed max-w-xl mx-auto">
            Five bite-sized games to giggle, guess and get to know each other a little better. Curl up on the couch
            or connect from anywhere.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.6, ease: "easeOut" }}
          className="mt-12 grid md:grid-cols-2 gap-5"
        >
          <Link to="/local" className="group">
            <div className="card p-8 shadow-warm hover:shadow-warm-lg transition">
              <div className="w-14 h-14 rounded-2xl bg-blush flex items-center justify-center mb-4">
                <Sofa className="w-7 h-7 text-coral-deep" strokeWidth={1.8} />
              </div>
              <h2 className="heading-serif text-3xl text-plum">Local Play</h2>
              <p className="text-plum-soft mt-2">
                One device, two hearts. Perfect for the couch, a café table or a long train ride.
              </p>
              <span className="mt-6 inline-flex text-coral font-semibold">Start locally →</span>
            </div>
          </Link>
          <Link to="/online" className="group">
            <div className="card p-8 shadow-warm hover:shadow-warm-lg transition">
              <div className="w-14 h-14 rounded-2xl bg-coral flex items-center justify-center mb-4">
                <Wifi className="w-7 h-7 text-white" strokeWidth={1.8} />
              </div>
              <h2 className="heading-serif text-3xl text-plum">Online Play</h2>
              <p className="text-plum-soft mt-2">
                Create a room, share the invite link, and play together across any distance in real time.
              </p>
              <span className="mt-6 inline-flex text-coral font-semibold">Create a room →</span>
            </div>
          </Link>
        </motion.div>

        <div className="mt-16 text-center">
          <p className="script text-3xl text-plum-soft">
            “the best games are the ones we play together.”
          </p>
        </div>
      </div>
    </Layout>
  );
}
