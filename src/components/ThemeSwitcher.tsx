"use client";

import React from "react";
import { useTheme } from "@/contexts/ThemeContext";

const THEMES = [
  { id: "gold", name: "Gold", color: "#c8a96e" },
  { id: "sapphire", name: "Sapphire", color: "#4B90D8" },
  { id: "emerald", name: "Emerald", color: "#40B883" },
  { id: "amethyst", name: "Amethyst", color: "#9B59B6" },
  { id: "light", name: "Light", color: "#fdfcf8" },
] as const;

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '0.5rem 0.5rem' }}>
      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Theme</span>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
        {THEMES.map((t) => (
          <button
            key={t.id}
            onClick={() => setTheme(t.id as any)}
            title={t.name}
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: t.color,
              border: theme === t.id ? '2px solid var(--text)' : '1px solid var(--border)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: theme === t.id ? '0 0 8px var(--accent-glow)' : 'none',
              transform: theme === t.id ? 'scale(1.15)' : 'scale(1)',
            }}
            aria-label={`Switch to ${t.name} theme`}
          />
        ))}
      </div>
    </div>
  );
}
