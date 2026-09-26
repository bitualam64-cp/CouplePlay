import { motion } from "framer-motion";

interface FloatingHeart {
  left: string;
  top: string;
  size: number;
  delay: number;
  opacity: number;
}

const HEARTS: FloatingHeart[] = [
  { left: "6%", top: "18%", size: 30, delay: 0, opacity: 0.32 },
  { left: "88%", top: "22%", size: 24, delay: 0.6, opacity: 0.3 },
  { left: "72%", top: "58%", size: 34, delay: 1.4, opacity: 0.26 },
  { left: "12%", top: "52%", size: 20, delay: 0.3, opacity: 0.3 },
  { left: "26%", top: "76%", size: 22, delay: 1.9, opacity: 0.26 },
  { left: "60%", top: "12%", size: 18, delay: 2.5, opacity: 0.24 },
  { left: "42%", top: "30%", size: 16, delay: 1.0, opacity: 0.2 },
  { left: "15%", top: "78%", size: 26, delay: 1.1, opacity: 0.28 },
  { left: "82%", top: "68%", size: 20, delay: 1.7, opacity: 0.35 },
  { left: "48%", top: "8%", size: 16, delay: 2.2, opacity: 0.22 },
  { left: "35%", top: "90%", size: 18, delay: 0.9, opacity: 0.3 },
];

export default function HeartBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
      {HEARTS.map((h, i) => (
        <motion.div
          key={i}
          initial={{ y: 0, rotate: -8 }}
          animate={{ y: [-8, 8, -8], rotate: [-8, 8, -8] }}
          transition={{ duration: 6 + i * 0.4, repeat: Infinity, ease: "easeInOut", delay: h.delay }}
          style={{ left: h.left, top: h.top, opacity: h.opacity }}
          className="absolute"
        >
          <svg width={h.size} height={h.size} viewBox="0 0 24 24" fill="#E85F73">
            <path d="M12 21s-7.5-4.6-9.5-9.4C1.1 8.2 3.5 4.5 7 4.5c2 0 3.5 1.1 5 3 1.5-1.9 3-3 5-3 3.5 0 5.9 3.7 4.5 7.1C19.5 16.4 12 21 12 21z" />
          </svg>
        </motion.div>
      ))}
    </div>
  );
}
