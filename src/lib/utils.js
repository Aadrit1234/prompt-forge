export function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function estimateTokens(text) {
  return Math.max(1, Math.ceil((text || "").length / 4));
}

export function formatPercent(p) {
  if (p < 0.1) return "<0.1%";
  if (p < 10) return `${p.toFixed(1)}%`;
  return `${Math.round(p)}%`;
}

import { useCallback, useRef } from "react";

/**\ * React hook: returns onMouseMove / onMouseLeave handlers and a ref
 * that give the element a 3D tilt toward the cursor.\ * @param {number} maxDeg  max rotation in degrees (default 8)
 * @param {number} scale   hover scale factor (default 1.02)
 */
export function useTilt(maxDeg = 8, scale = 1.02) {
  const ref = useRef(null);

  const onMouseMove = useCallback(
    (e) => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;  // -0.5 → 0.5
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      el.style.transform = `perspective(600px) rotateY(${x * maxDeg}deg) rotateX(${-y * maxDeg}deg) scale3d(${scale},${scale},1)`;
    },
    [maxDeg, scale]
  );

  const onMouseLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = "perspective(600px) rotateY(0deg) rotateX(0deg) scale3d(1,1,1)";
  }, []);

  return { ref, onMouseMove, onMouseLeave };
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      return true;
    } catch {
      return false;
    }
  }
}
