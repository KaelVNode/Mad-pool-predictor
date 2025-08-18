// components/SocialLinks.jsx
"use client";
import { Twitter, Send, Github } from "lucide-react";

export default function SocialLinks({ className = "", compact = false }) {
  const btn = `inline-flex items-center gap-1 rounded-lg border-2 accent-border ${
    compact ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm"
  } accent-hover`;
  const icon = compact ? 14 : 16;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <a
        href="https://x.com/Kaelvin21"
        target="_blank"
        rel="noreferrer"
        title="X / Twitter"
        aria-label="X / Twitter"
        className={btn}
      >
        <Twitter size={icon} />
        <span>@Kaelvin21</span>
      </a>

      <a
        href="https://t.me/kael21"
        target="_blank"
        rel="noreferrer"
        title="Telegram"
        aria-label="Telegram"
        className={btn}
      >
        <Send size={icon} />
        <span>t.me/kael21</span>
      </a>

      <a
        href="https://github.com/KaelVNode"
        target="_blank"
        rel="noreferrer"
        title="GitHub"
        aria-label="GitHub"
        className={btn}
      >
        <Github size={icon} />
        <span>KaelVNode</span>
      </a>
    </div>
  );
}
