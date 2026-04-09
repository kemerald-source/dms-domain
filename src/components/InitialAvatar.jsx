// Initial-letter avatar with a deterministic color picked from the name.
// Used as a portrait fallback for characters and NPCs across DMD.

const AVATAR_COLORS = [
  { bg: 'rgba(180, 83, 9, 0.30)',  text: '#fcd34d', border: 'rgba(217, 119, 6, 0.45)'  }, // amber
  { bg: 'rgba(4, 120, 87, 0.30)',  text: '#6ee7b7', border: 'rgba(5, 150, 105, 0.45)'  }, // emerald
  { bg: 'rgba(29, 78, 216, 0.30)', text: '#93c5fd', border: 'rgba(37, 99, 235, 0.45)'  }, // blue
  { bg: 'rgba(126, 34, 206, 0.30)',text: '#d8b4fe', border: 'rgba(147, 51, 234, 0.45)' }, // purple
  { bg: 'rgba(190, 18, 60, 0.30)', text: '#fda4af', border: 'rgba(225, 29, 72, 0.45)'  }, // rose
  { bg: 'rgba(13, 148, 136, 0.30)',text: '#5eead4', border: 'rgba(20, 184, 166, 0.45)' }, // teal
  { bg: 'rgba(194, 65, 12, 0.30)', text: '#fdba74', border: 'rgba(234, 88, 12, 0.45)'  }, // orange
  { bg: 'rgba(67, 56, 202, 0.30)', text: '#a5b4fc', border: 'rgba(79, 70, 229, 0.45)'  }, // indigo
];

function hashString(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h) + s.charCodeAt(i);
    h |= 0; // force int32
  }
  return Math.abs(h);
}

export default function InitialAvatar({
  name,
  size = 44,
  rounded = 'rounded-lg',
  className = '',
}) {
  const safeName = (name || '?').trim();
  const initial = safeName.charAt(0).toUpperCase() || '?';
  const color = AVATAR_COLORS[hashString(safeName) % AVATAR_COLORS.length];

  return (
    <div
      className={`${rounded} border flex items-center justify-center font-cinzel font-semibold shrink-0 select-none ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.42),
        background: color.bg,
        color: color.text,
        borderColor: color.border,
      }}
      aria-hidden="true"
    >
      {initial}
    </div>
  );
}
