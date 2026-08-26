import { useEffect, useRef } from "react";

/**
 * Fires a burst of colorful particles from the center of the viewport.
 * Accepts a `trigger` number — increments to re-fire.
 */
export default function CelebrationBurst({ trigger }) {
  const canvasRef = useRef(null);
  const prevTrigger = useRef(0);

  useEffect(() => {
    if (trigger === prevTrigger.current) return;
    prevTrigger.current = trigger;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = [];
    const COLORS = ["#2dd4bf", "#6366f1", "#f472b6", "#fbbf24", "#a78bfa", "#34d399"];
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    for (let i = 0; i < 60; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 6 + 2;
      particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r: Math.random() * 4 + 2,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        life: 1,
        decay: Math.random() * 0.015 + 0.008,
        gravity: 0.05,
      });
    }

    let animId;
    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;

      for (const p of particles) {
        if (p.life <= 0) continue;
        alive = true;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.vx *= 0.99;
        p.life -= p.decay;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life * 0.8;
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      if (alive) {
        animId = requestAnimationFrame(animate);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }

    animate();
    return () => cancelAnimationFrame(animId);
  }, [trigger]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        pointerEvents: "none",
      }}
    />
  );
}
