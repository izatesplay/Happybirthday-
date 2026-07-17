import { useEffect, useRef } from 'react';

export default function BackgroundParticles() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Track mouse position with smooth easing
    const mouse = { x: width / 2, y: height / 2, targetX: width / 2, targetY: height / 2 };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.targetX = e.clientX;
      mouse.targetY = e.clientY;
    };

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('resize', handleResize);

    // Particles array
    interface Particle {
      x: number;
      y: number;
      size: number;
      speedX: number;
      speedY: number;
      color: string;
      alpha: number;
      pulseSpeed: number;
      pulseDir: number;
      parallaxFactor: number;
    }

    const particles: Particle[] = [];
    const colors = [
      'rgba(16, 185, 129, 0.4)', // Emerald Green
      'rgba(52, 211, 153, 0.4)', // Mint Green
      'rgba(56, 189, 248, 0.4)', // Sky Blue
      'rgba(34, 211, 238, 0.4)', // Turquoise Cyan
      'rgba(14, 165, 233, 0.3)'  // Ocean Blue
    ];

    // Initialize particles
    const particleCount = Math.min(70, Math.floor((width * height) / 20000));
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 5 + 1.5,
        speedX: (Math.random() - 0.5) * 0.4,
        speedY: -Math.random() * 0.5 - 0.1, // Always float upwards
        color: colors[Math.floor(Math.random() * colors.length)]!,
        alpha: Math.random() * 0.6 + 0.2,
        pulseSpeed: Math.random() * 0.015 + 0.005,
        pulseDir: Math.random() > 0.5 ? 1 : -1,
        parallaxFactor: Math.random() * 0.04 + 0.01 // Parallax depth
      });
    }

    // Animation Loop
    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      // Smoothly interpolate mouse coords
      mouse.x += (mouse.targetX - mouse.x) * 0.08;
      mouse.y += (mouse.targetY - mouse.y) * 0.08;

      // Draw subtle ambient vignette glow (Emerald and Cyan)
      const radialGlow = ctx.createRadialGradient(
        mouse.x,
        mouse.y,
        10,
        width / 2,
        height / 2,
        Math.max(width, height)
      );
      radialGlow.addColorStop(0, 'rgba(2, 44, 34, 0.25)'); // deep forest emerald
      radialGlow.addColorStop(0.5, 'rgba(2, 26, 30, 0.08)'); // deep dark teal
      radialGlow.addColorStop(1, 'rgba(3, 7, 18, 0)'); // black
      ctx.fillStyle = radialGlow;
      ctx.fillRect(0, 0, width, height);

      // Draw & update particles
      particles.forEach((p) => {
        // Apply parallax effect based on mouse position
        const offsetX = (mouse.x - width / 2) * p.parallaxFactor;
        const offsetY = (mouse.y - height / 2) * p.parallaxFactor;

        ctx.save();
        ctx.beginPath();
        
        // Pulse transparency
        p.alpha += p.pulseSpeed * p.pulseDir;
        if (p.alpha > 0.85) {
          p.alpha = 0.85;
          p.pulseDir = -1;
        } else if (p.alpha < 0.15) {
          p.alpha = 0.15;
          p.pulseDir = 1;
        }

        ctx.fillStyle = p.color.replace('0.4', p.alpha.toFixed(2)).replace('0.3', p.alpha.toFixed(2));
        ctx.shadowBlur = p.size * 2.5;
        ctx.shadowColor = ctx.fillStyle as string;

        // Draw some particles as floating heart shapes or circular lights
        const isSpecial = p.size > 4.2;
        if (isSpecial) {
          // Draw a lovely floating heart shape
          const cx = p.x + offsetX;
          const cy = p.y + offsetY;
          const size = p.size * 1.6;
          
          ctx.moveTo(cx, cy + size * 0.3);
          ctx.bezierCurveTo(cx - size / 2, cy - size / 2, cx - size, cy + size / 3, cx, cy + size);
          ctx.bezierCurveTo(cx + size, cy + size / 3, cx + size / 2, cy - size / 2, cx, cy + size * 0.3);
        } else {
          ctx.arc(p.x + offsetX, p.y + offsetY, p.size, 0, Math.PI * 2);
        }
        
        ctx.fill();
        ctx.restore();

        // Move particle
        p.x += p.speedX;
        p.y += p.speedY;

        // Wrap around boundaries
        if (p.y < -20) {
          p.y = height + 20;
          p.x = Math.random() * width;
        }
        if (p.x < -20) p.x = width + 20;
        if (p.x > width + 20) p.x = -20;
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      id="bg-canvas"
      className="fixed inset-0 w-full h-full -z-10 pointer-events-none"
    />
  );
}
