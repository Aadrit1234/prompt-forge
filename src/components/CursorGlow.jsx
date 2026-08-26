import { useEffect, useRef, useState } from "react";

/**
 * A soft radial gradient that follows the cursor.
 * Rendered as a fixed-position div with CSS transitions for smooth following.
 * Hidden when the mouse hasn't moved (saves GPU).
 */
const DARK_GLOW =
  "radial-gradient(circle, rgba(56, 189, 248, 0.15) 0%, rgba(30, 90, 180, 0.08) 40%, transparent 70%)";
const LIGHT_GLOW =
  "radial-gradient(circle, rgba(56, 189, 248, 0.12) 0%, rgba(8, 145, 178, 0.06) 40%, transparent 70%)";

export default function CursorGlow() {
  const glowRef = useRef(null);
  const [visible, setVisible] = useState(false);
  const [theme, setTheme] = useState(() =>
    document.documentElement.getAttribute("data-theme") || "dark"
  );
  const rafRef = useRef(null);
  const pos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    const observer = new MutationObserver(() => {
      setTheme(document.documentElement.getAttribute("data-theme") || "dark");
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    function onMouse(e) {
      pos.current.x = e.clientX;
      pos.current.y = e.clientY;
      if (!visible) setVisible(true);
      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(() => {
          const el = glowRef.current;
          if (el) {
            el.style.transform = `translate(${pos.current.x - 250}px, ${pos.current.y - 250}px)`;
          }
          rafRef.current = null;
        });
      }
    }

    function onLeave() {
      setVisible(false);
    }

    window.addEventListener("mousemove", onMouse, { passive: true });
    document.addEventListener("mouseleave", onLeave);

    return () => {
      observer.disconnect();
      window.removeEventListener("mousemove", onMouse);
      document.removeEventListener("mouseleave", onLeave);
      cancelAnimationFrame(rafRef.current);
    };
  }, [visible]);

  return (
    <div
      ref={glowRef}
      aria-hidden="true"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: 500,
        height: 500,
        borderRadius: "50%",
        background: theme === "light" ? LIGHT_GLOW : DARK_GLOW,
        pointerEvents: "none",
        zIndex: 0,
        opacity: visible ? 1 : 0,
        transition: "opacity 0.4s ease, background 0.6s ease",
        willChange: "transform",
      }}
    />
  );
}
