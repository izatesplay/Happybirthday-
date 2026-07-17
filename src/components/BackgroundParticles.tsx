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
      'rgba(16, 185, 129, 0.4)', // Emerald
      'rgba(52, 211, 153, 0.4)', // Mint Green
      'rgba(14, 165, 233, 0.4)', // Sky Blue
      'rgba(56, 189, 248, 0.4)', // Light Turquoise
      'rgba(6, 182, 212, 0.3)'   // Cyan
    ];

    // Initialize particles
    const particleCount = Math.min(60, Math.floor((width * height) / 25000));
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 6 + 1.5,
        speedX: (Math.random() - 0.5) * 0.4,
        speedY: -Math.random() * 0.6 - 0.1, // Always float upwards
        color: colors[Math.floor(Math.random() * colors.length)]!,
        alpha: Math.random() * 0.5 + 0.2,
        pulseSpeed: Math.random() * 0.02 + 0.005,
        pulseDir: Math.random() > 0.5 ? 1 : -1,
        parallaxFactor: Math.random() * 0.05 + 0.01 // Parallax depth
      });
    }

    // Animation Loop
    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      // Smoothly interpolate mouse coords
      mouse.x += (mouse.targetX - mouse.x) * 0.08;
      mouse.y += (mouse.targetY - mouse.y) * 0.08;

      // Draw subtle ambient vignette glow
      const radialGlow = ctx.createRadialGradient(
        mouse.x,
        mouse.y,
        10,
        width / 2,
        height / 2,
        Math.max(width, height)
      );
      radialGlow.addColorStop(0, 'rgba(6, 78, 59, 0.15)'); // deep teal
      radialGlow.addColorStop(0.5, 'rgba(2, 44, 34, 0.05)'); // deep forest
      radialGlow.addColorStop(1, 'rgba(3, 7, 18, 0)'); // dark grey
      ctx.fillStyle = radialGlow;
      ctx.fillRect(0, 0, width, height);

      // Draw & update particles
      particles.forEach((p) => {
        // Apply parallax effect based on mouse position
        const offsetX = (mouse.x - width / 2) * p.parallaxFactor;
        const offsetY = (mouse.y - height / 2) * p.parallaxFactor;

        ctx.save();
        ctx.beginPath();
        ctx.arc(p.x + offsetX, p.y + offsetY, p.size, 0, Math.PI * 2);
        
        // Pulse transparency
        p.alpha += p.pulseSpeed * p.pulseDir;
        if (p.alpha > 0.8) {
          p.alpha = 0.8;
          p.pulseDir = -1;
        } else if (p.alpha < 0.1) {
          p.alpha = 0.1;
          p.pulseDir = 1;
        }

        ctx.fillStyle = p.color.replace('0.4', p.alpha.toFixed(2)).replace('0.3', p.alpha.toFixed(2));
        ctx.shadowBlur = p.size * 2;
        ctx.shadowColor = ctx.fillStyle as string;
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
