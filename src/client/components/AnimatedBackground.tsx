import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  shape: string;
}

const AnimatedBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let particles: Particle[] = [];
    const mouse = { x: -1000, y: -1000 };

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const createParticles = () => {
      const count = Math.min(80, Math.floor((canvas.width * canvas.height) / 15000));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.6,
        size: Math.random() * 3 + 1.5,
        alpha: Math.random() * 0.5 + 0.15,
        shape: (['circle', 'diamond', 'plus'])[Math.floor(Math.random() * 3)],
      }));
    };

    const drawShape = (p: Particle) => {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = '#4a9eff';
      ctx.translate(p.x, p.y);

      switch (p.shape) {
        case 'circle':
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, Math.PI * 2);
          ctx.fill();
          break;
        case 'diamond':
          ctx.rotate(Math.PI / 4);
          ctx.fillRect(-p.size, -p.size, p.size * 2, p.size * 2);
          break;
        case 'plus':
          ctx.fillRect(-p.size / 2, -p.size * 1.5, p.size, p.size * 3);
          ctx.fillRect(-p.size * 1.5, -p.size / 2, p.size * 3, p.size);
          break;
      }
      ctx.restore();
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 150) {
          p.vx -= dx / dist * 0.01;
          p.vy -= dy / dist * 0.01;
        }

        drawShape(p);

        for (let j = i + 1; j < particles.length; j++) {
          const dx2 = p.x - particles[j].x;
          const dy2 = p.y - particles[j].y;
          const dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
          if (dist2 < 130) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(74, 158, 255, ${0.06 * (1 - dist2 / 130)})`;
            ctx.lineWidth = 0.8;
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      });

      animationId = requestAnimationFrame(animate);
    };

    const onMouse = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };

    resize();
    createParticles();
    animate();
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', onMouse);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMouse);
    };
  }, []);

  return <canvas ref={canvasRef} className="animated-bg-canvas" />;
};

export default AnimatedBackground;