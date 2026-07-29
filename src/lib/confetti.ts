import confetti from "canvas-confetti";

export const celebrateSuccess = () => {
  const duration = 1400;
  const animationEnd = Date.now() + duration;

  const defaults = {
    startVelocity: 28,
    spread: 70,
    ticks: 120,
    gravity: 0.8,
    scalar: 0.8,
    zIndex: 9999,
    colors: [
      "#8B5CF6", // Purple
      "#6366F1", // Indigo
      "#3B82F6", // Blue
      "#FFFFFF", // White
      "#A855F7",
    ],
  };

  const interval = setInterval(() => {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      clearInterval(interval);
      return;
    }

    confetti({
      ...defaults,
      particleCount: 4,
      origin: { x: 0.15, y: 0.25 },
    });

    confetti({
      ...defaults,
      particleCount: 4,
      origin: { x: 0.85, y: 0.25 },
    });
  }, 120);
};
