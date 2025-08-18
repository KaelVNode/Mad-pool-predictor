// components/MSBadge.jsx
"use client";
import { FlaskConical, ExternalLink } from "lucide-react";

export default function MSBadge() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Badge brand */}
      <a
        href="https://www.madscientists.io/"
        target="_blank" rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-full border-2 border-white px-3 py-1
                   text-xs hover:bg-white/5 transition"
        title="Mad Scientists"
      >
        <FlaskConical size={14} />
        <span>Mad Scientists</span>
        <ExternalLink size={12} className="opacity-70" />
      </a>

      {/* Follow on X */}
      <a
        href="https://x.com/madscientists_x"
        target="_blank" rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-full border-2 border-white px-3 py-1
                   text-xs hover:bg-white/5 transition"
        title="Follow @madscientists_x"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5">
          <path fill="currentColor"
            d="M18.244 2H21.5l-7.5 8.57L23.5 22h-7.372l-5.77-6.897L3.5 22H.244l8.214-9.385L.5 2h7.372l5.208 6.224L18.244 2Zm-1.29 18h2.02L7.62 4H5.5l11.454 16Z" />
        </svg>
        <span>@madscientists_x</span>
      </a>

      {/* Theme link */}
      <a
        href="https://x.com/madscientists_x/status/1954975519243468808"
        target="_blank" rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-full border-2 border-white px-3 py-1
                   text-xs hover:bg-white/5 transition"
        title="Theme: Open Build, Everything is an Experiment"
      >
        🧪 Theme: Open Build
      </a>

      {/* Discord instructions (Mad University) */}
      <a
        href="https://www.madscientists.io/maduniversity"
        target="_blank" rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-full border-2 border-white px-3 py-1
                   text-xs hover:bg-white/5 transition"
        title="Discord /signup instructions"
      >
        💬 Discord: /signup
      </a>
    </div>
  );
}
