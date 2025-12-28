import { useState, useEffect, useCallback } from "react";
import "./BirthdayOverlay.css";

const FIRST_LAUNCH_KEY = "loikka_first_launch_shown";

// Balloon colors (festive palette)
const BALLOON_COLORS = [
  "#FF6B6B", "#4ECDC4", "#FFE66D", "#95E1D3", "#F38181",
  "#AA96DA", "#60A5FA", "#F9C5D1", "#98D8AA", "#FFB6C1",
];

interface BalloonProps {
  color: string;
  style: React.CSSProperties;
}

function Balloon({ color, style }: BalloonProps) {
  return (
    <div
      className="birthday-balloon"
      style={{
        ...style,
        backgroundColor: color,
        "--balloon-color": color,
      } as React.CSSProperties}
    >
      <div className="balloon-shine" />
    </div>
  );
}

interface HeartProps {
  style: React.CSSProperties;
}

function Heart({ style }: HeartProps) {
  return (
    <div className="birthday-heart" style={style}>
      ❤️
    </div>
  );
}

interface SparkleProps {
  style: React.CSSProperties;
}

function Sparkle({ style }: SparkleProps) {
  return (
    <div className="birthday-sparkle" style={style}>
      ✨
    </div>
  );
}

export function BirthdayOverlay() {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [balloons, setBalloons] = useState<BalloonProps[]>([]);
  const [hearts, setHearts] = useState<HeartProps[]>([]);
  const [sparkles, setSparkles] = useState<SparkleProps[]>([]);

  // Check if this is the first launch
  useEffect(() => {
    const hasShown = localStorage.getItem(FIRST_LAUNCH_KEY);
    if (!hasShown) {
      setIsVisible(true);
      createInitialElements();
    }
  }, []);

  const createInitialElements = () => {
    // Create initial balloons
    const newBalloons: BalloonProps[] = [];
    for (let i = 0; i < 12; i++) {
      const color = BALLOON_COLORS[Math.floor(Math.random() * BALLOON_COLORS.length)];
      const size = 45 + Math.random() * 25;
      newBalloons.push({
        color,
        style: {
          left: `${Math.random() * 95}vw`,
          width: `${size}px`,
          height: `${size * 1.2}px`,
          "--delay": `${Math.random() * 2 + 0.3}s`,
          "--duration": `${Math.random() * 3 + 7}s`,
          "--sway": `${(Math.random() - 0.5) * 120}px`,
          "--rotation": `${(Math.random() - 0.5) * 25}deg`,
        } as React.CSSProperties,
      });
    }
    setBalloons(newBalloons);

    // Create initial hearts
    const newHearts: HeartProps[] = [];
    for (let i = 0; i < 15; i++) {
      newHearts.push({
        style: {
          left: `${Math.random() * 95}vw`,
          fontSize: `${18 + Math.random() * 14}px`,
          "--delay": `${Math.random() * 4 + 0.5}s`,
          "--duration": `${Math.random() * 3 + 6}s`,
          "--sway": `${(Math.random() - 0.5) * 100}px`,
          "--rotation": `${(Math.random() - 0.5) * 30}deg`,
        } as React.CSSProperties,
      });
    }
    setHearts(newHearts);

    // Create sparkles
    const newSparkles: SparkleProps[] = [];
    for (let i = 0; i < 20; i++) {
      newSparkles.push({
        style: {
          left: `${Math.random() * 100}vw`,
          top: `${Math.random() * 100}vh`,
          fontSize: `${12 + Math.random() * 12}px`,
          "--delay": `${Math.random() * 3}s`,
          "--duration": `${1.5 + Math.random() * 2}s`,
        } as React.CSSProperties,
      });
    }
    setSparkles(newSparkles);
  };

  // Add more balloons and hearts periodically
  useEffect(() => {
    if (!isVisible || isClosing) return;

    const balloonInterval = setInterval(() => {
      const newBalloons: BalloonProps[] = [];
      for (let i = 0; i < 8; i++) {
        const color = BALLOON_COLORS[Math.floor(Math.random() * BALLOON_COLORS.length)];
        const size = 45 + Math.random() * 25;
        newBalloons.push({
          color,
          style: {
            left: `${Math.random() * 95}vw`,
            width: `${size}px`,
            height: `${size * 1.2}px`,
            "--delay": `${Math.random() * 2}s`,
            "--duration": `${Math.random() * 3 + 7}s`,
            "--sway": `${(Math.random() - 0.5) * 120}px`,
            "--rotation": `${(Math.random() - 0.5) * 25}deg`,
          } as React.CSSProperties,
        });
      }
      setBalloons(prev => [...prev.slice(-20), ...newBalloons]);
    }, 7000);

    const heartInterval = setInterval(() => {
      const newHearts: HeartProps[] = [];
      for (let i = 0; i < 10; i++) {
        newHearts.push({
          style: {
            left: `${Math.random() * 95}vw`,
            fontSize: `${18 + Math.random() * 14}px`,
            "--delay": `${Math.random() * 3}s`,
            "--duration": `${Math.random() * 3 + 6}s`,
            "--sway": `${(Math.random() - 0.5) * 100}px`,
            "--rotation": `${(Math.random() - 0.5) * 30}deg`,
          } as React.CSSProperties,
        });
      }
      setHearts(prev => [...prev.slice(-25), ...newHearts]);
    }, 5000);

    return () => {
      clearInterval(balloonInterval);
      clearInterval(heartInterval);
    };
  }, [isVisible, isClosing]);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    localStorage.setItem(FIRST_LAUNCH_KEY, "true");
    setTimeout(() => {
      setIsVisible(false);
    }, 600);
  }, []);

  if (!isVisible) return null;

  return (
    <div
      className={`birthday-overlay ${isClosing ? "closing" : ""}`}
      onClick={handleClose}
    >
      {/* Sparkles */}
      {sparkles.map((sparkle, i) => (
        <Sparkle key={`sparkle-${i}`} style={sparkle.style} />
      ))}

      {/* Hearts */}
      {hearts.map((heart, i) => (
        <Heart key={`heart-${i}`} style={heart.style} />
      ))}

      {/* Balloons */}
      {balloons.map((balloon, i) => (
        <Balloon key={`balloon-${i}`} color={balloon.color} style={balloon.style} />
      ))}

      {/* Content */}
      <div className="birthday-content">
        {/* CSS Gift Box */}
        <div className="gift-container">
          <div className="gift-bow" />
          <div className="bow-center" />
          <div className="gift-lid" />
          <div className="gift-box" />
        </div>

        <div className="birthday-text">Hauskaa syntymäpäivää,</div>
        <div className="birthday-name">Hanna!</div>
        <div className="click-hint">Klikkaa jatkaaksesi</div>
      </div>
    </div>
  );
}
