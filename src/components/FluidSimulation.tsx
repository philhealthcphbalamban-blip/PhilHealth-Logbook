'use client';

import React, { useEffect, useRef } from 'react';

export function FluidSimulation() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    let animationFrameId: number;

    const particles: {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: string;
      alpha: number;
      decay: number;
    }[] = [];

    const themeColors = [
      '#059669', // Emerald
      '#10b981', // Mint
      '#0284c7', // Sky Blue
      '#7c3aed', // Purple
      '#06b6d4', // Cyan
      '#34d399'  // Light Teal
    ];

    const addParticles = (x: number, y: number, count = 3) => {
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 2.5 + 0.5;
        const color = themeColors[Math.floor(Math.random() * themeColors.length)];

        particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: Math.random() * 25 + 10,
          color,
          alpha: 0.45,
          decay: Math.random() * 0.012 + 0.008,
        });
      }
    };

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      let px = 0;
      let py = 0;
      if ('touches' in e && e.touches.length > 0) {
        px = e.touches[0].clientX;
        py = e.touches[0].clientY;
      } else if ('clientX' in e) {
        px = (e as MouseEvent).clientX;
        py = (e as MouseEvent).clientY;
      }
      addParticles(px, py, 4);
    };

    window.addEventListener('mousemove', handlePointerMove, { passive: true });
    window.addEventListener('touchmove', handlePointerMove, { passive: true });

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    // Initial ambient fluid particles
    for (let i = 0; i < 20; i++) {
      addParticles(Math.random() * width, Math.random() * height, 1);
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Random ambient floating fluid bursts
      if (Math.random() < 0.1) {
        addParticles(Math.random() * width, Math.random() * height, 1);
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;
        p.size *= 0.985;

        if (p.alpha <= 0 || p.size <= 0.5) {
          particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.beginPath();
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
        gradient.addColorStop(0, p.color);
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0 mix-blend-screen opacity-70 dark:opacity-80 transition-opacity"
    />
  );
}
