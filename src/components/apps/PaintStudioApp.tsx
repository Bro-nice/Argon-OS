import React, { useRef, useState, useEffect } from 'react';
import {
  Brush,
  Eraser,
  Minus,
  Square,
  Circle,
  Undo2,
  Trash2,
  Download,
  Save,
  Check,
} from 'lucide-react';
import { DeviceSpace, FileItem } from '../../types/os';
import { readSpaceData, writeSpaceData } from '../../utils/localVault';
import { GHOST_DEFAULT_FILES, PRIMARY_DEFAULT_FILES } from './FilesApp';
import { triggerHaptic } from '../../utils/hardware';

interface PaintStudioAppProps {
  deviceSpace: DeviceSpace;
}

type DrawTool = 'brush' | 'eraser' | 'line' | 'rect' | 'circle';

const PALETTE = [
  '#f8fafc',
  '#22d3ee',
  '#34d399',
  '#fbbf24',
  '#fb7185',
  '#818cf8',
  '#f97316',
  '#a855f7',
  '#64748b',
  '#0f172a',
];

export const PaintStudioApp: React.FC<PaintStudioAppProps> = ({ deviceSpace }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<DrawTool>('brush');
  const [color, setColor] = useState('#22d3ee');
  const [brushSize, setBrushSize] = useState(4);
  const [isDrawing, setIsDrawing] = useState(false);
  const [history, setHistory] = useState<ImageData[]>([]);
  const [savedToast, setSavedToast] = useState(false);

  const startPos = useRef<{ x: number; y: number } | null>(null);
  const snapshotRef = useRef<ImageData | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHistory([ctx.getImageData(0, 0, canvas.width, canvas.height)]);
  }, []);

  const getCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pos = getCoords(e);
    startPos.current = pos;
    snapshotRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setIsDrawing(true);

    if (tool === 'brush' || tool === 'eraser') {
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx || !startPos.current) return;

    const pos = getCoords(e);
    ctx.strokeStyle = tool === 'eraser' ? '#090d16' : color;
    ctx.lineWidth = tool === 'eraser' ? brushSize * 3 : brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (tool === 'brush' || tool === 'eraser') {
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    } else if (snapshotRef.current) {
      ctx.putImageData(snapshotRef.current, 0, 0);
      ctx.beginPath();
      if (tool === 'line') {
        ctx.moveTo(startPos.current.x, startPos.current.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
      } else if (tool === 'rect') {
        ctx.strokeRect(
          startPos.current.x,
          startPos.current.y,
          pos.x - startPos.current.x,
          pos.y - startPos.current.y
        );
      } else if (tool === 'circle') {
        const radius = Math.hypot(pos.x - startPos.current.x, pos.y - startPos.current.y);
        ctx.arc(startPos.current.x, startPos.current.y, radius, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  };

  const handlePointerUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      const snap = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setHistory((prev) => [...prev.slice(-19), snap]);
    }
  };

  const handleUndo = () => {
    if (history.length <= 1) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const nextHist = history.slice(0, -1);
    const last = nextHist[nextHist.length - 1];
    ctx.putImageData(last, 0, 0);
    setHistory(nextHist);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const snap = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setHistory((prev) => [...prev.slice(-19), snap]);
  };

  const handleSaveToFiles = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    triggerHaptic(15);
    const dataUrl = canvas.toDataURL('image/png');
    const base = deviceSpace === 'ghost' ? GHOST_DEFAULT_FILES : PRIMARY_DEFAULT_FILES;
    const existing = readSpaceData<FileItem[]>(deviceSpace, 'files', base);
    const item: FileItem = {
      id: `sketch-${Date.now()}`,
      name: `canvas_${new Date().toISOString().slice(11, 19).replace(/:/g, '-')}.png`,
      path: '/Photos',
      type: 'image',
      sizeBytes: Math.round(dataUrl.length * 0.75),
      updatedAt: 'Saved Locally',
      dataUrl,
    };
    writeSpaceData(deviceSpace, 'files', [item, ...existing]);
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 1800);
  };

  const handleDownloadPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `argonos-sketch-${Date.now()}.png`;
    a.click();
  };

  return (
    <div className="flex-1 w-full h-full bg-slate-950 text-white flex flex-col overflow-hidden select-none">
      {/* Studio Toolbar */}
      <div className="px-3 py-2 bg-slate-900 border-b border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1">
          {(
            [
              { id: 'brush', icon: Brush, label: 'Brush' },
              { id: 'line', icon: Minus, label: 'Line' },
              { id: 'rect', icon: Square, label: 'Rect' },
              { id: 'circle', icon: Circle, label: 'Circle' },
              { id: 'eraser', icon: Eraser, label: 'Eraser' },
            ] as const
          ).map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTool(t.id)}
                className={`p-2 rounded-lg border cursor-pointer ${
                  tool === t.id
                    ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                    : 'bg-slate-950 border-white/10 text-slate-300 hover:text-white'
                }`}
                title={t.label}
              >
                <Icon className="w-3.5 h-3.5" />
              </button>
            );
          })}

          <div className="flex items-center gap-2 ml-2 px-2 py-1 rounded-lg bg-slate-950 border border-white/10">
            <span className="text-[10px] font-mono text-slate-400">{brushSize}px</span>
            <input
              type="range"
              min="1"
              max="24"
              value={brushSize}
              onChange={(e) => setBrushSize(parseInt(e.target.value, 10))}
              className="w-16 accent-cyan-400 cursor-pointer"
            />
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {PALETTE.map((c) => (
            <button
              key={c}
              onClick={() => {
                setColor(c);
                if (tool === 'eraser') setTool('brush');
              }}
              style={{ backgroundColor: c }}
              className={`w-5 h-5 rounded-full cursor-pointer border-2 ${
                color === c && tool !== 'eraser' ? 'border-white scale-110' : 'border-white/20'
              }`}
              title={c}
            />
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleUndo}
            disabled={history.length <= 1}
            className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 disabled:opacity-40 cursor-pointer"
            title="Undo"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleClear}
            className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 border border-white/10 text-rose-300 cursor-pointer"
            title="Clear Canvas"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleSaveToFiles}
            className="px-2.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold flex items-center gap-1 cursor-pointer"
          >
            {savedToast ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
            <span>{savedToast ? 'Saved to /Photos' : 'Save'}</span>
          </button>
          <button
            onClick={handleDownloadPng}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 cursor-pointer"
            title="Export PNG"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
          </button>
        </div>
      </div>

      {/* Canvas Stage */}
      <div className="flex-1 p-3 flex items-center justify-center bg-[#06080f] overflow-hidden">
        <canvas
          ref={canvasRef}
          width={960}
          height={560}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          className="max-w-full max-h-full aspect-[12/7] rounded-xl border border-white/15 shadow-2xl touch-none cursor-crosshair bg-[#090d16]"
        />
      </div>
    </div>
  );
};
