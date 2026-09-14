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

    // Mouse tracking with inertia
    const mouse = {
      x: width / 2,
      y: height / 2,
      targetX: width / 2,
      targetY: height / 2,
      vx: 0,
      vy: 0,
      radius: 140,
    };

    // Color palette matching PhilHealth / Emerald theme
    const themeColors = [
      { r: 5, g: 150, b: 105 },   // Emerald #059669
      { r: 16, g: 185, b: 129 },  // Mint #10b981
      { r: 2, g: 132, b: 199 },   // Sky Blue #0284c7
      { r: 6, g: 182, b: 212 },   // Cyan #06b6d4
      { r: 124, g: 58, b: 237 },  // Purple #7c3aed
      { r: 52, g: 211, b: 153 }   // Light Teal #34d399
    ];

    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: { r: number; g: number; b: number };
      alpha: number;
      decay: number;
    }

    interface AmbientNode {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      color: { r: number; g: number; b: number };
      alpha: number;
      phase: number;
    }

    const particles: Particle[] = [];
    const ambientNodes: AmbientNode[] = [];
    const ripples: { x: number; y: number; radius: number; maxRadius: number; alpha: number }[] = [];

    // Create persistent ambient fluid nodes that flow continuously
    const nodeCount = 16;
    for (let i = 0; i < nodeCount; i++) {
      const color = themeColors[i % themeColors.length];
      ambientNodes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.7,
        vy: (Math.random() - 0.5) * 0.7,
        radius: Math.random() * 130 + 90,
        color,
        alpha: Math.random() * 0.18 + 0.12,
        phase: Math.random() * Math.PI * 2,
      });
    }

    const addParticles = (x: number, y: number, count = 4) => {
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 3 + 1;
        const color = themeColors[Math.floor(Math.random() * themeColors.length)];

        particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed + mouse.vx * 0.15,
          vy: Math.sin(angle) * speed + mouse.vy * 0.15,
          size: Math.random() * 32 + 14,
          color,
          alpha: 0.65,
          decay: Math.random() * 0.014 + 0.007,
        });
      }
    };

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      let px = mouse.targetX;
      let py = mouse.targetY;
      if ('touches' in e && e.touches.length > 0) {
        px = e.touches[0].clientX;
        py = e.touches[0].clientY;
      } else if ('clientX' in e) {
        px = (e as MouseEvent).clientX;
        py = (e as MouseEvent).clientY;
      }

      mouse.vx = px - mouse.targetX;
      mouse.vy = py - mouse.targetY;
      mouse.targetX = px;
      mouse.targetY = py;

      addParticles(px, py, 3);
    };

    const handleClick = (e: MouseEvent) => {
      ripples.push({
        x: e.clientX,
        y: e.clientY,
        radius: 12,
        maxRadius: 200,
        alpha: 0.75,
      });
      addParticles(e.clientX, e.clientY, 16);
    };

    window.addEventListener('mousemove', handlePointerMove, { passive: true });
    window.addEventListener('touchmove', handlePointerMove, { passive: true });
    window.addEventListener('click', handleClick, { passive: true });

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Smooth lerp mouse position
      mouse.x += (mouse.targetX - mouse.x) * 0.15;
      mouse.y += (mouse.targetY - mouse.y) * 0.15;

      // 1. Render Ambient Persistent Fluid Blobs
      for (const node of ambientNodes) {
        node.x += node.vx;
        node.y += node.vy;
        node.phase += 0.015;

        if (node.x < -node.radius) node.x = width + node.radius;
        if (node.x > width + node.radius) node.x = -node.radius;
        if (node.y < -node.radius) node.y = height + node.radius;
        if (node.y > height + node.radius) node.y = -node.radius;

        // Interaction with mouse cursor
        const dx = mouse.x - node.x;
        const dy = mouse.y - node.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 260 && dist > 0) {
          node.x -= (dx / dist) * 0.9;
          node.y -= (dy / dist) * 0.9;
        }

        const currentRadius = node.radius + Math.sin(node.phase) * 18;
        const grad = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, currentRadius);
        grad.addColorStop(0, `rgba(${node.color.r}, ${node.color.g}, ${node.color.b}, ${node.alpha})`);
        grad.addColorStop(1, `rgba(${node.color.r}, ${node.color.g}, ${node.color.b}, 0)`);

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(node.x, node.y, currentRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      // 2. Render Cursor Fluid Glow Aura
      const mouseGrad = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, mouse.radius);
      mouseGrad.addColorStop(0, 'rgba(16, 185, 129, 0.35)');
      mouseGrad.addColorStop(0.5, 'rgba(6, 182, 212, 0.18)');
      mouseGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = mouseGrad;
      ctx.beginPath();
      ctx.arc(mouse.x, mouse.y, mouse.radius, 0, Math.PI * 2);
      ctx.fill();

      // 3. Render Click Water Ripples
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        r.radius += 4.5;
        r.alpha -= 0.014;

        if (r.alpha <= 0 || r.radius >= r.maxRadius) {
          ripples.splice(i, 1);
          continue;
        }

        ctx.strokeStyle = `rgba(16, 185, 129, ${r.alpha})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
        ctx.stroke();
      }

      // 4. Render Dynamic Particles Trail
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;
        p.size *= 0.975;

        if (p.alpha <= 0 || p.size <= 0.5) {
          particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.beginPath();
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
        grad.addColorStop(0, `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${Math.max(0, p.alpha)})`);
        grad.addColorStop(1, `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, 0)`);
        ctx.fillStyle = grad;
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
      window.removeEventListener('click', handleClick);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[1] opacity-90 transition-opacity"
    />
  );
}
