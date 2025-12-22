import { useEffect, useRef } from "react";

interface ConfettiProps {
  active: boolean;
  onComplete?: () => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  rotation: number;
  rotationSpeed: number;
  life: number;
  shape: "rect" | "circle" | "star";
  shimmer: number;
  shimmerSpeed: number;
}

const COLORS = [
  "#FFD700", // Gold
  "#FFC107", // Amber gold
  "#10B981", // Success green
  "#34D399", // Light green
  "#60A5FA", // Accent blue
  "#3B82F6", // Bright blue
  "#F472B6", // Pink
  "#EC4899", // Hot pink
  "#A78BFA", // Purple
  "#8B5CF6", // Violet
  "#FBBF24", // Amber
  "#F59E0B", // Orange
];

export function Confetti({ active, onComplete }: ConfettiProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const particlesRef = useRef<Particle[]>([]);

  useEffect(() => {
    if (!active) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Create initial burst of particles
    const particles: Particle[] = [];
    const initialParticleCount = 200;
    const shapes: ("rect" | "circle" | "star")[] = ["rect", "rect", "circle", "star"];

    // Initial burst from multiple points
    const burstPoints = [
      { x: canvas.width * 0.3, y: canvas.height * 0.2 },
      { x: canvas.width * 0.5, y: canvas.height * 0.1 },
      { x: canvas.width * 0.7, y: canvas.height * 0.2 },
    ];

    for (let i = 0; i < initialParticleCount; i++) {
      const burstPoint = burstPoints[Math.floor(Math.random() * burstPoints.length)];
      particles.push({
        x: burstPoint.x + (Math.random() - 0.5) * 100,
        y: burstPoint.y + (Math.random() - 0.5) * 50,
        vx: (Math.random() - 0.5) * 15,
        vy: Math.random() * -8 + Math.random() * 4,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        size: Math.random() * 10 + 6,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.3,
        life: 1,
        shape: shapes[Math.floor(Math.random() * shapes.length)],
        shimmer: Math.random() * Math.PI * 2,
        shimmerSpeed: Math.random() * 0.2 + 0.1,
      });
    }

    particlesRef.current = particles;

    let startTime = Date.now();
    const duration = 5000; // 5 seconds
    let lastSpawnTime = startTime;

    const drawStar = (ctx: CanvasRenderingContext2D, size: number) => {
      const spikes = 5;
      const outerRadius = size / 2;
      const innerRadius = size / 4;

      ctx.beginPath();
      for (let i = 0; i < spikes * 2; i++) {
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        const angle = (i * Math.PI) / spikes - Math.PI / 2;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.closePath();
      ctx.fill();
    };

    const animate = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      const progress = elapsed / duration;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Spawn new particles during the first 2 seconds
      if (elapsed < 2000 && now - lastSpawnTime > 50) {
        lastSpawnTime = now;
        const spawnCount = 8;
        for (let i = 0; i < spawnCount; i++) {
          const burstPoint = burstPoints[Math.floor(Math.random() * burstPoints.length)];
          particlesRef.current.push({
            x: burstPoint.x + (Math.random() - 0.5) * 150,
            y: -20,
            vx: (Math.random() - 0.5) * 10,
            vy: Math.random() * 3 + 2,
            color: COLORS[Math.floor(Math.random() * COLORS.length)],
            size: Math.random() * 10 + 5,
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.25,
            life: 1,
            shape: shapes[Math.floor(Math.random() * shapes.length)],
            shimmer: Math.random() * Math.PI * 2,
            shimmerSpeed: Math.random() * 0.2 + 0.1,
          });
        }
      }

      let activeParticles = 0;

      for (const particle of particlesRef.current) {
        if (particle.life <= 0) continue;

        // Update position
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vy += 0.12; // Gravity
        particle.rotation += particle.rotationSpeed;
        particle.shimmer += particle.shimmerSpeed;

        // Fade out towards the end
        if (progress > 0.6) {
          particle.life -= 0.015;
        }

        // Add some air resistance and wobble
        particle.vx *= 0.99;
        particle.vx += Math.sin(particle.shimmer) * 0.1;

        // Calculate shimmer effect
        const shimmerAlpha = 0.7 + Math.sin(particle.shimmer) * 0.3;

        // Draw particle
        ctx.save();
        ctx.translate(particle.x, particle.y);
        ctx.rotate(particle.rotation);
        ctx.globalAlpha = Math.max(0, particle.life * shimmerAlpha);
        ctx.fillStyle = particle.color;

        // Add glow effect
        ctx.shadowColor = particle.color;
        ctx.shadowBlur = 8;

        switch (particle.shape) {
          case "rect":
            ctx.fillRect(
              -particle.size / 2,
              -particle.size / 4,
              particle.size,
              particle.size / 2
            );
            break;
          case "circle":
            ctx.beginPath();
            ctx.arc(0, 0, particle.size / 3, 0, Math.PI * 2);
            ctx.fill();
            break;
          case "star":
            drawStar(ctx, particle.size);
            break;
        }

        ctx.restore();

        if (particle.y < canvas.height + 50 && particle.life > 0) {
          activeParticles++;
        }
      }

      if (activeParticles > 0 && progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        // Animation complete
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        onComplete?.();
      }
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [active, onComplete]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-50"
      style={{ width: "100vw", height: "100vh" }}
    />
  );
}
