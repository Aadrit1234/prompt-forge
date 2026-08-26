import { useEffect, useRef, useState } from "react";

/**
 * A soft radial gradient that follows the cursor.
 * Rendered as a fixed-position div with CSS transitions for smooth following.
 * Hidden when the mouse hasn't moved (saves GPU).
 */
export default function CursorGlow() {
  const glowRef = useRef(null);
  const [visible, setVisible] = useState(false);
  const rafRef = useRef(null);
  const pos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    function onMouse(e) {
      pos.current.x = e.clientX;
      pos.current.y = e.clientY;
      if (!visible) setVisible(true);
      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(() => {
          const el = glowRef.current;
          if (el) {
            el.style.transform = `translate(${pos.current.x - 200}px, ${pos.current.y - 200}px)`;
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
        width: 400,
        height: 400,
        borderRadius: "50%",
        background:
          "radial-gradient(circle, rgba(56, 189, 248, 0.10) 0%, rgba(8, 145, 178, 0.05) 40%, transparent 70%)",
        pointerEvents: "none",
        zIndex: 0,
        opacity: visible ? 1 : 0,
        transition: "opacity 0.4s ease",
        willChange: "transform",
      }}
    />
  );
}
