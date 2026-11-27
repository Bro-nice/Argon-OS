import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Gamepad2, RotateCcw, Trophy, Zap } from 'lucide-react';
import { DeviceSpace } from '../../types/os';
import { triggerHaptic } from '../../utils/hardware';
import { readSpaceData, writeSpaceData } from '../../utils/localVault';

interface CyberRunnerAppProps {
  deviceSpace?: DeviceSpace;
}

export const CyberRunnerApp: React.FC<CyberRunnerAppProps> = ({ deviceSpace = 'primary' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState<number>(() =>
    readSpaceData<number>(deviceSpace, 'runner_highscore', 140)
  );
  const [gameOver, setGameOver] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const gameState = useRef({
    playerY: 180,
    velocity: 0,
    isJumping: false,
    obstacles: [] as { x: number; width: number; height: number }[],
    frame: 0,
    score: 0,
  });

  const startGame = useCallback(() => {
    gameState.current = {
      playerY: 180,
      velocity: 0,
      isJumping: false,
      obstacles: [{ x: 340, width: 22, height: 35 }],
      frame: 0,
      score: 0,
    };
    setScore(0);
    setGameOver(false);
    setIsPlaying(true);
    triggerHaptic(20);
  }, []);

  const jump = useCallback(() => {
    if (!isPlaying) {
      startGame();
      return;
    }
    if (!gameState.current.isJumping) {
      gameState.current.velocity = -11;
      gameState.current.isJumping = true;
      triggerHaptic(15);
    }
  }, [isPlaying, startGame]);

  // Keyboard support (Space / ArrowUp / W)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
        e.preventDefault();
        jump();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [jump]);

  useEffect(() => {
    if (!isPlaying) return;

    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const loop = () => {
      const state = gameState.current;
      state.frame++;

      // Gravity
      state.velocity += 0.65;
      state.playerY += state.velocity;
      if (state.playerY >= 180) {
        state.playerY = 180;
        state.velocity = 0;
        state.isJumping = false;
      }

      // Move obstacles (gradual speed scaling)
      const speed = Math.min(7.5, 4.5 + state.score * 0.008);
      for (let i = 0; i < state.obstacles.length; i++) {
        state.obstacles[i].x -= speed;
      }

      // Add new obstacle
      if (state.frame % 85 === 0) {
        const height = 24 + Math.random() * 26;
        state.obstacles.push({ x: 360, width: 22, height });
      }

      // Filter passed obstacles
      if (state.obstacles.length > 0 && state.obstacles[0].x < -30) {
        state.obstacles.shift();
        state.score += 10;
        setScore(state.score);
        setHighScore((prev) => {
          if (state.score > prev) {
            writeSpaceData(deviceSpace, 'runner_highscore', state.score);
            return state.score;
          }
          return prev;
        });
      }

      // Collision detection
      const playerBox = { x: 45, y: state.playerY, width: 24, height: 28 };
      for (const obs of state.obstacles) {
        if (
          playerBox.x < obs.x + obs.width &&
          playerBox.x + playerBox.width > obs.x &&
          playerBox.y + playerBox.height > 210 - obs.height
        ) {
          triggerHaptic([30, 40, 30]);
          setGameOver(true);
          setIsPlaying(false);
          return;
        }
      }

      // Draw
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 210);
      ctx.lineTo(canvas.width, 210);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
      const offset = (state.frame * 4) % 40;
      for (let x = -offset; x < canvas.width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 210);
        ctx.lineTo(x - 20, 240);
        ctx.stroke();
      }

      ctx.fillStyle = '#38bdf8';
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 12;
      ctx.fillRect(playerBox.x, playerBox.y, playerBox.width, playerBox.height);
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#f43f5e';
      ctx.shadowColor = '#f43f5e';
      ctx.shadowBlur = 10;
      for (const obs of state.obstacles) {
        ctx.fillRect(obs.x, 210 - obs.height, obs.width, obs.height);
      }
      ctx.shadowBlur = 0;

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, deviceSpace]);

  return (
    <div
      onClick={jump}
      className="flex-1 w-full h-full bg-slate-950 text-white flex flex-col justify-between p-4 select-none overflow-hidden cursor-pointer"
    >
      <div className="flex items-center justify-between pb-2 border-b border-white/10 text-xs">
        <div className="flex items-center gap-1.5 font-bold text-cyan-400">
          <Gamepad2 className="w-4 h-4" />
          <span>CYBER RUNNER</span>
        </div>

        <div className="flex items-center gap-4 font-mono">
          <span className="text-amber-400 flex items-center gap-1">
            <Trophy className="w-3.5 h-3.5" />
            {highScore}
          </span>
          <span className="text-white font-bold text-sm tabular-nums">Score: {score}</span>
        </div>
      </div>

      <div className="my-auto flex flex-col items-center justify-center relative">
        <canvas
          ref={canvasRef}
          width={360}
          height={240}
          className="rounded-xl border border-cyan-500/30 bg-black/80 shadow-2xl w-full max-w-md"
        />

        {!isPlaying && !gameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm rounded-xl space-y-2">
            <Zap className="w-9 h-9 text-cyan-400" />
            <span className="text-sm font-bold text-white">Click or Press Space to Start</span>
            <span className="text-[10px] text-slate-400 font-mono">GPU Canvas Loop · Local High Score</span>
          </div>
        )}

        {gameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm rounded-xl space-y-3">
            <span className="text-base font-bold text-rose-400">RUN ENDED</span>
            <span className="text-xs font-mono text-white">Score: {score} · Best: {highScore}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                startGame();
              }}
              className="px-4 py-2 rounded-lg bg-cyan-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-lg active:scale-95"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retry Run</span>
            </button>
          </div>
        )}
      </div>

      <div className="text-center text-[10px] text-slate-500 font-mono">
        Click or press Space / ↑ to leap · Local space high score saved
      </div>
    </div>
  );
};
