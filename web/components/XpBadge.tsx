"use client";
import { useEffect, useState } from "react";

export default function XpBadge({ initialXp }: { initialXp: number }) {
  const [xp, setXp] = useState(initialXp);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (initialXp !== xp) {
      setXp(initialXp);
      setAnimate(true);
      const t = setTimeout(() => setAnimate(false), 1000);
      return () => clearTimeout(t);
    }
  }, [initialXp, xp]);

  return (
    <p className={`text-xs font-bold transition-colors duration-300 ${animate ? "text-brand-500 scale-110 drop-shadow-md" : "text-sage-600"}`}>
      {xp} XP {animate && "✨"}
    </p>
  );
}