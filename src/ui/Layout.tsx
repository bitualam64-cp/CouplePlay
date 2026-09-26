import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Heart } from "lucide-react";
import HeartBackground from "./HeartBackground";

export default function Layout({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="relative min-h-screen">
      <HeartBackground />
      <header className="relative z-10">
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-5 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="relative">
              <div className="absolute inset-0 bg-coral/40 blur-lg rounded-full group-hover:bg-coral/60 transition" />
              <Heart className="relative w-7 h-7 text-coral fill-coral" strokeWidth={1.5} />
            </div>
            <div className="leading-none">
              <div className="heading-serif text-2xl text-plum">CouplePlay</div>
              <div className="text-[10px] tracking-[0.22em] uppercase text-plum-soft mt-0.5">a little more us</div>
            </div>
          </Link>
          <div>{right}</div>
        </div>
      </header>
      <main className="relative z-10">{children}</main>
      <footer className="relative z-10 mt-12 pb-10 text-center text-xs text-plum-soft">
        Made with <Heart className="inline w-3 h-3 text-coral fill-coral align-[-2px]" /> for two.
      </footer>
    </div>
  );
}
