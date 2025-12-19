import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  rotation: number;
  rotationSpeed: number;
  size: number;
}

export function MouseTrail() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: 0, y: 0 });
  const lastEmitRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };

      const now = Date.now();
      if (now - lastEmitRef.current > 30) {
        for (let i = 0; i < 2; i++) {
          particlesRef.current.push({
            x: e.clientX,
            y: e.clientY,
            vx: (Math.random() - 0.5) * 2,
            vy: (Math.random() - 0.5) * 2,
            life: 1,
            maxLife: 1,
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.1,
            size: Math.random() * 8 + 4,
          });
        }
        lastEmitRef.current = now;
      }
    };

    window.addEventListener('mousemove', handleMouseMove);

    let animationFrame: number;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particlesRef.current = particlesRef.current.filter(particle => {
        particle.life -= 0.016;
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.rotation += particle.rotationSpeed;

        if (particle.life <= 0) return false;

        const alpha = particle.life / particle.maxLife;
        ctx.save();
        ctx.translate(particle.x, particle.y);
        ctx.rotate(particle.rotation);
        ctx.globalAlpha = alpha;

        ctx.fillStyle = '#ffd04f';
        ctx.shadowColor = '#ffd04f';
        ctx.shadowBlur = 10;

        const size = particle.size * alpha;
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
          const x = Math.cos(angle) * size;
          const y = Math.sin(angle) * size;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }

          const innerAngle = angle + Math.PI / 5;
          const innerX = Math.cos(innerAngle) * (size * 0.4);
          const innerY = Math.sin(innerAngle) * (size * 0.4);
          ctx.lineTo(innerX, innerY);
        }
        ctx.closePath();
        ctx.fill();

        ctx.restore();
        return true;
      });

      animationFrame = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrame);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-50"
      style={{ mixBlendMode: 'screen' }}
    />
  );
}
