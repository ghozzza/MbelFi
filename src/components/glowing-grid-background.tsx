"use client";

import React, { useEffect, useState } from "react";

interface GridItem {
  id: string;
  x: number;
  y: number;
  delay: number;
  intensity: number;
}

interface PulseItem {
  id: number;
  x: number;
  y: number;
  delay: number;
  size: number;
}

interface FloatingParticle {
  id: number;
  x: number;
  y: number;
  animationDuration: number;
  animationDelay: number;
  opacity: number;
}

const GlowingGridBackground: React.FC = () => {
  const [gridItems, setGridItems] = useState<GridItem[]>([]);
  const [pulseItems, setPulseItems] = useState<PulseItem[]>([]);
  const [floatingParticles, setFloatingParticles] = useState<
    FloatingParticle[]
  >([]);

  useEffect(() => {
    // Generate grid pattern
    const grid: GridItem[] = [];
    const gridSize = 20;
    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        if (Math.random() > 0.7) {
          grid.push({
            id: `${i}-${j}`,
            x: (i / gridSize) * 100,
            y: (j / gridSize) * 100,
            delay: Math.random() * 5,
            intensity: Math.random() * 0.5 + 0.3,
          });
        }
      }
    }
    setGridItems(grid);

    // Generate random pulse effects
    const pulses: PulseItem[] = [];
    for (let i = 0; i < 15; i++) {
      pulses.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        delay: Math.random() * 8,
        size: Math.random() * 15 + 10,
      });
    }
    setPulseItems(pulses);

    // Generate floating particles
    const particles: FloatingParticle[] = [];
    for (let i = 0; i < 30; i++) {
      particles.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        animationDuration: Math.random() * 10 + 15,
        animationDelay: Math.random() * 10,
        opacity: Math.random() * 0.4 + 0.1,
      });
    }
    setFloatingParticles(particles);
  }, []);

  return (
    <>
      <div className="fixed inset-0 overflow-hidden">
        {/* Base background */}
        <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-900 to-slate-900" />

        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-10">
          <div className="w-full h-full bg-gradient-to-r from-transparent via-blue-500/5 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-500/5 to-transparent" />
        </div>

        {/* Grid items */}
        {gridItems.map((item) => (
          <div
            key={item.id}
            className="absolute w-2 h-2 bg-blue-400/60 border border-blue-300/30 animate-sparkle"
            style={{
              left: `${item.x}%`,
              top: `${item.y}%`,
              opacity: item.intensity * 0.8,
              animationDelay: `${item.delay}s`,
              boxShadow: `0 0 8px rgba(59, 130, 246, ${item.intensity * 0.4})`,
            }}
          />
        ))}

        {/* Pulse effects */}
        {pulseItems.map((pulse) => (
          <div
            key={pulse.id}
            className="absolute rounded-full border-2 border-blue-400/20 bg-blue-500/5 animate-pulse-custom"
            style={{
              left: `${pulse.x}%`,
              top: `${pulse.y}%`,
              width: `${pulse.size}px`,
              height: `${pulse.size}px`,
              animationDelay: `${pulse.delay}s`,
            }}
          />
        ))}

        {/* Floating particles */}
        <div className="absolute inset-0">
          {floatingParticles.map((particle) => (
            <div
              key={particle.id}
              className="absolute w-1 h-1 bg-blue-300/60 rounded-full animate-drift"
              style={{
                left: `${particle.x}%`,
                top: `${particle.y}%`,
                animationDuration: `${particle.animationDuration}s`,
                animationDelay: `${particle.animationDelay}s`,
                opacity: particle.opacity,
              }}
            />
          ))}
        </div>
      </div>
    </>
  );
};

export default GlowingGridBackground;
