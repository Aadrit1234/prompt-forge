import { useEffect, useRef } from "react";

/**
 * Full-viewport canvas with drifting particles connected by fading lines.
 * Purely decorative — renders behind everything via fixed positioning.
 * Respects prefers-reduced-motion.
 */
export default function ParticleField() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    let animId;
    let w, h;
    const particles = [];
    const PARTICLE_COUNT = 60;
    const CONNECT_DIST = 140;
    const MOUSE_RADIUS = 200;
    let mouse = { x: -9999, y: -9999 };

    function resize() {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    }

    function createParticles() {
      particles.length = 0;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        particles.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.4,
          vy: (Math.random() - 0.5) * 0.4,
          r: Math.random() * 2 + 1,
          hue: Math.random() > 0.5 ? 170 : 270, // teal or purple
          alpha: Math.random() * 0.5 + 0.2,
          pulse: Math.random() * Math.PI * 2,
        });
      }
    }

    function onMouse(e) {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    }

    function draw() {
      ctx.clearRect(0, 0, w, h);

      // Update & draw particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.pulse += 0.02;
        const pulseFactor = 0.7 + 0.3 * Math.sin(p.pulse);

        // Drift
        p.x += p.vx;
        p.y += p.vy;

        // Mouse repulsion (gentle)
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < MOUSE_RADIUS && dist > 0) {
          const force = (1 - dist / MOUSE_RADIUS) * 0.015;
          p.vx += (dx / dist) * force;
          p.vy += (dy / dist) * force;
        }

        // Dampen velocity
        p.vx *= 0.998;
        p.vy *= 0.998;

        // Wrap around
        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;
        if (p.y < -10) p.y = h + 10;
        if (p.y > h + 10) p.y = -10;

        // Draw particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * pulseFactor, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 80%, 65%, ${p.alpha * pulseFactor})`;
        ctx.fill();

        // Connect nearby particles
        for (let j = i + 1; j < particles.length; j++) {
          const q = particles[j];
          const ddx = p.x - q.x;
          const ddy = p.y - q.y;
          const d = Math.sqrt(ddx * ddx + ddy * ddy);
          if (d < CONNECT_DIST) {
            const opacity = (1 - d / CONNECT_DIST) * 0.12;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.strokeStyle = `hsla(${(p.hue + q.hue) / 2}, 70%, 60%, ${opacity})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }

        // Glow line to mouse
        if (dist < MOUSE_RADIUS && dist > 0) {
          const glowOpacity = (1 - dist / MOUSE_RADIUS) * 0.08;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.strokeStyle = `hsla(170, 90%, 70%, ${glowOpacity})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }

      animId = requestAnimationFrame(draw);
    }

    resize();
    createParticles();

    if (!prefersReduced) {
      window.addEventListener("resize", resize);
      window.addEventListener("mousemove", onMouse);
      draw();
    } else {
      // Draw a single static frame for reduced-motion users
      draw();
    }

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouse);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: -1,
        pointerEvents: "none",
        opacity: 0.6,
      }}
    />
  );
}
