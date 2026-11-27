import React, { useEffect, useRef, useState } from 'react';
import {
  GraduationCap,
  Play,
  Pause,
  RotateCcw,
  StepForward,
  BookOpen,
  BookmarkPlus,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { DeviceSpace, PrivacyProfile } from '../../types/os';
import { requestTutorSession, TutorResponse } from '../../services/api';
import { addKnowledgeNode } from '../../utils/humanOsStore';
import { triggerHaptic } from '../../utils/hardware';

interface LearnAppProps {
  deviceSpace: DeviceSpace;
  privacy: PrivacyProfile;
}

type LabType = 'pendulum' | 'waves' | 'logic';

export const LearnApp: React.FC<LearnAppProps> = ({ deviceSpace, privacy }) => {
  const [mode, setMode] = useState<'labs' | 'tutor'>('labs');
  const [activeLab, setActiveLab] = useState<LabType>('pendulum');
  const [isPlaying, setIsPlaying] = useState(true);

  // Pendulum Lab Parameters
  const [lengthM, setLengthM] = useState(1.4);
  const [gravity, setGravity] = useState(9.8);
  const [damping, setDamping] = useState(0.02);
  const pendulumStateRef = useRef({ angle: Math.PI / 3.2, omega: 0 });
  const [energyReadout, setEnergyReadout] = useState({ ke: 0, pe: 100, angleDeg: 56 });

  // Wave Interference Lab Parameters
  const [waveFreqHz, setWaveFreqHz] = useState(2.2);
  const [slitSepPx, setSlitSepPx] = useState(56);
  const waveTimeRef = useRef(0);

  // Logic Gate Lab Parameters
  const [inputA, setInputA] = useState(true);
  const [inputB, setInputB] = useState(false);
  const [gateType, setGateType] = useState<'AND' | 'OR' | 'XOR' | 'NAND'>('XOR');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Tutor State
  const [topic, setTopic] = useState('Conservation of Energy');
  const [tutorData, setTutorData] = useState<TutorResponse | null>(null);
  const [isLoadingTutor, setIsLoadingTutor] = useState(false);
  const [selectedQuizIdx, setSelectedQuizIdx] = useState<number | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);

  const stepPhysics = (dt: number) => {
    const st = pendulumStateRef.current;
    const alpha = -(gravity / lengthM) * Math.sin(st.angle) - damping * st.omega;
    st.omega += alpha * dt;
    st.angle += st.omega * dt;

    const h = lengthM * (1 - Math.cos(st.angle));
    const v = lengthM * st.omega;
    const pe = gravity * h;
    const ke = 0.5 * v * v;
    const total = Math.max(0.0001, pe + ke);

    setEnergyReadout({
      pe: Math.round((pe / total) * 100),
      ke: Math.round((ke / total) * 100),
      angleDeg: Math.round((st.angle * 180) / Math.PI),
    });
  };

  // Real 60fps HTML5 Canvas Simulation Loop
  useEffect(() => {
    if (mode !== 'labs' || activeLab === 'logic') return;
    let rafId = 0;
    let lastTime = performance.now();

    const renderFrame = (now: number) => {
      const dt = Math.min(0.032, (now - lastTime) / 1000);
      lastTime = now;

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const w = canvas.width;
          const h = canvas.height;

          if (activeLab === 'pendulum') {
            if (isPlaying) stepPhysics(dt);

            ctx.fillStyle = '#090d16';
            ctx.fillRect(0, 0, w, h);

            // Grid coordinates
            ctx.strokeStyle = 'rgba(148,163,184,0.12)';
            ctx.lineWidth = 1;
            for (let gx = 0; gx < w; gx += 32) {
              ctx.beginPath();
              ctx.moveTo(gx, 0);
              ctx.lineTo(gx, h);
              ctx.stroke();
            }
            for (let gy = 0; gy < h; gy += 32) {
              ctx.beginPath();
              ctx.moveTo(0, gy);
              ctx.lineTo(w, gy);
              ctx.stroke();
            }

            const pivotX = w / 2;
            const pivotY = 26;
            const pxLen = 58 + lengthM * 42;
            const bobX = pivotX + Math.sin(pendulumStateRef.current.angle) * pxLen;
            const bobY = pivotY + Math.cos(pendulumStateRef.current.angle) * pxLen;

            // Equilibrium dashed line
            ctx.setLineDash([4, 4]);
            ctx.strokeStyle = 'rgba(56,189,248,0.28)';
            ctx.beginPath();
            ctx.moveTo(pivotX, pivotY);
            ctx.lineTo(pivotX, pivotY + pxLen + 14);
            ctx.stroke();
            ctx.setLineDash([]);

            // Rod
            ctx.strokeStyle = '#94a3b8';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(pivotX, pivotY);
            ctx.lineTo(bobX, bobY);
            ctx.stroke();

            // Pivot
            ctx.fillStyle = '#e2e8f0';
            ctx.beginPath();
            ctx.arc(pivotX, pivotY, 4.5, 0, Math.PI * 2);
            ctx.fill();

            // Bob
            const speedGlow = Math.min(1, Math.abs(pendulumStateRef.current.omega) / 3);
            ctx.fillStyle = speedGlow > 0.45 ? '#38bdf8' : '#10b981';
            ctx.beginPath();
            ctx.arc(bobX, bobY, 13, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.5;
            ctx.stroke();
          } else if (activeLab === 'waves') {
            if (isPlaying) waveTimeRef.current += dt * waveFreqHz * 4.5;
            const t = waveTimeRef.current;

            const img = ctx.createImageData(w, h);
            const data = img.data;
            const s1y = h / 2 - slitSepPx / 2;
            const s2y = h / 2 + slitSepPx / 2;
            const sx = 34;
            const k = 0.16 * waveFreqHz;

            for (let y = 0; y < h; y += 2) {
              for (let x = 0; x < w; x += 2) {
                const d1 = Math.hypot(x - sx, y - s1y);
                const d2 = Math.hypot(x - sx, y - s2y);
                const amp = Math.sin(d1 * k - t) + Math.sin(d2 * k - t);
                const norm = (amp + 2) / 4;

                const r = Math.round(12 + norm * 42);
                const g = Math.round(28 + norm * 168);
                const b = Math.round(52 + norm * 200);

                for (let dy = 0; dy < 2 && y + dy < h; dy++) {
                  for (let dx = 0; dx < 2 && x + dx < w; dx++) {
                    const idx = ((y + dy) * w + (x + dx)) * 4;
                    data[idx] = r;
                    data[idx + 1] = g;
                    data[idx + 2] = b;
                    data[idx + 3] = 255;
                  }
                }
              }
            }
            ctx.putImageData(img, 0, 0);

            // Coherent source markers
            [s1y, s2y].forEach((sy) => {
              ctx.fillStyle = '#fbbf24';
              ctx.beginPath();
              ctx.arc(sx, sy, 4.5, 0, Math.PI * 2);
              ctx.fill();
            });
          }
        }
      }

      rafId = requestAnimationFrame(renderFrame);
    };

    rafId = requestAnimationFrame(renderFrame);
    return () => cancelAnimationFrame(rafId);
  }, [mode, activeLab, isPlaying, lengthM, gravity, damping, waveFreqHz, slitSepPx]);

  const resetPendulum = () => {
    triggerHaptic(10);
    pendulumStateRef.current = { angle: Math.PI / 3.2, omega: 0 };
    stepPhysics(0);
  };

  const computeGateOutput = () => {
    switch (gateType) {
      case 'AND':
        return inputA && inputB;
      case 'OR':
        return inputA || inputB;
      case 'XOR':
        return inputA !== inputB;
      case 'NAND':
        return !(inputA && inputB);
    }
  };
  const gateOutput = computeGateOutput();

  const handleAskTutor = async (customTopic?: string) => {
    const q = (customTopic ?? topic).trim();
    if (!q || isLoadingTutor) return;
    triggerHaptic(15);
    setIsLoadingTutor(true);
    setSelectedQuizIdx(null);
    setShowHint(false);
    setSavedNotice(false);

    try {
      const res = await requestTutorSession(q, 'curious learner', privacy.localOnlyAirGap);
      setTutorData(res);
    } finally {
      setIsLoadingTutor(false);
    }
  };

  const handleSaveLessonToKnowledge = () => {
    if (!tutorData) return;
    triggerHaptic(15);
    addKnowledgeNode(
      deviceSpace,
      topic,
      `${tutorData.explanation}\n\nCore Principle: ${tutorData.keyPrinciple}\nExperiment: ${tutorData.practicePrompt}`,
      ['learning', 'tutor']
    );
    setSavedNotice(true);
  };

  return (
    <div className="flex-1 w-full h-full bg-slate-950 text-white flex flex-col p-4 select-none overflow-y-auto space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <GraduationCap className="w-4 h-4 text-sky-400" />
          <h1 className="text-sm font-bold text-white">Intelligent Education</h1>
        </div>

        <div className="flex items-center gap-1 bg-slate-900 border border-white/10 rounded-xl p-0.5 text-xs">
          <button
            onClick={() => setMode('labs')}
            className={`min-h-[32px] px-3 rounded-lg cursor-pointer ${
              mode === 'labs' ? 'bg-sky-500 text-slate-950 font-bold' : 'text-slate-300'
            }`}
          >
            Virtual Labs
          </button>
          <button
            onClick={() => setMode('tutor')}
            className={`min-h-[32px] px-3 rounded-lg cursor-pointer ${
              mode === 'tutor' ? 'bg-sky-500 text-slate-950 font-bold' : 'text-slate-300'
            }`}
          >
            AI Tutor
          </button>
        </div>
      </div>

      {mode === 'labs' ? (
        <div className="space-y-3 flex-1">
          {/* Lab Selector */}
          <div className="grid grid-cols-3 gap-1.5 text-[11px]">
            {[
              { id: 'pendulum' as LabType, label: 'Pendulum Energy' },
              { id: 'waves' as LabType, label: 'Wave Interference' },
              { id: 'logic' as LabType, label: 'Digital Logic' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  triggerHaptic(10);
                  setActiveLab(item.id);
                }}
                className={`min-h-[36px] px-2 rounded-xl border font-semibold cursor-pointer transition-colors ${
                  activeLab === item.id
                    ? 'bg-sky-500/20 border-sky-400 text-sky-200'
                    : 'bg-slate-900 border-white/10 text-slate-400 hover:text-white'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Interactive Stage Zone */}
          {activeLab !== 'logic' ? (
            <div className="rounded-2xl bg-slate-900 border border-white/10 overflow-hidden">
              <canvas
                ref={canvasRef}
                width={320}
                height={186}
                className="w-full h-44 block bg-[#090d16]"
              />
              {/* Playback Controls */}
              <div className="px-3 py-2 border-t border-white/10 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="min-h-[34px] px-3 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    <span>{isPlaying ? 'Pause' : 'Play'}</span>
                  </button>
                  {activeLab === 'pendulum' && (
                    <>
                      <button
                        onClick={() => {
                          setIsPlaying(false);
                          stepPhysics(0.03);
                        }}
                        className="min-h-[34px] min-w-[34px] rounded-lg bg-white/10 hover:bg-white/15 flex items-center justify-center cursor-pointer"
                        title="Step Forward"
                      >
                        <StepForward className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={resetPendulum}
                        className="min-h-[34px] min-w-[34px] rounded-lg bg-white/10 hover:bg-white/15 flex items-center justify-center cursor-pointer"
                        title="Reset"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>

                <span className="font-mono text-[11px] text-sky-300 tabular-nums">
                  {activeLab === 'pendulum'
                    ? `θ = ${energyReadout.angleDeg}°`
                    : `f = ${waveFreqHz.toFixed(1)} Hz`}
                </span>
              </div>
            </div>
          ) : (
            /* Digital Logic Circuit Sandbox */
            <div className="p-4 rounded-2xl bg-slate-900 border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">Gate Architecture</span>
                <div className="flex gap-1">
                  {(['AND', 'OR', 'XOR', 'NAND'] as const).map((g) => (
                    <button
                      key={g}
                      onClick={() => setGateType(g)}
                      className={`min-h-[30px] px-2.5 rounded-lg text-[11px] font-mono cursor-pointer border ${
                        gateType === g
                          ? 'bg-sky-500 text-slate-950 border-sky-400 font-bold'
                          : 'bg-slate-950 border-white/10 text-slate-300'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 items-center gap-2 py-2">
                <div className="space-y-2">
                  <button
                    onClick={() => setInputA(!inputA)}
                    className={`w-full min-h-[40px] rounded-xl font-mono text-xs font-bold border cursor-pointer ${
                      inputA
                        ? 'bg-emerald-500/25 border-emerald-400 text-emerald-300'
                        : 'bg-slate-950 border-white/15 text-slate-400'
                    }`}
                  >
                    IN A: {inputA ? '1 (HIGH)' : '0 (LOW)'}
                  </button>
                  <button
                    onClick={() => setInputB(!inputB)}
                    className={`w-full min-h-[40px] rounded-xl font-mono text-xs font-bold border cursor-pointer ${
                      inputB
                        ? 'bg-emerald-500/25 border-emerald-400 text-emerald-300'
                        : 'bg-slate-950 border-white/15 text-slate-400'
                    }`}
                  >
                    IN B: {inputB ? '1 (HIGH)' : '0 (LOW)'}
                  </button>
                </div>

                <div className="flex flex-col items-center justify-center">
                  <div className="px-4 py-3 rounded-xl bg-slate-950 border border-sky-400/50 font-mono text-sm font-black text-sky-300">
                    {gateType}
                  </div>
                </div>

                <div
                  className={`min-h-[64px] rounded-xl border flex flex-col items-center justify-center font-mono ${
                    gateOutput
                      ? 'bg-sky-500/25 border-sky-400 text-sky-200'
                      : 'bg-slate-950 border-white/15 text-slate-400'
                  }`}
                >
                  <span className="text-[10px]">OUT Q</span>
                  <span className="text-lg font-black">{gateOutput ? '1' : '0'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Parameter Control & Concept Deck */}
          {activeLab === 'pendulum' && (
            <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-white/10 space-y-2.5 text-xs">
              <div className="grid grid-cols-2 gap-2 pb-2 border-b border-white/10">
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-emerald-300">Potential (PE)</span>
                    <span className="font-mono tabular-nums">{energyReadout.pe}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      style={{ width: `${energyReadout.pe}%` }}
                      className="h-full bg-emerald-400"
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-sky-300">Kinetic (KE)</span>
                    <span className="font-mono tabular-nums">{energyReadout.ke}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      style={{ width: `${energyReadout.ke}%` }}
                      className="h-full bg-sky-400"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span>Length</span>
                  <span className="font-mono text-sky-300 tabular-nums">{lengthM.toFixed(1)} m</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2.2"
                  step="0.1"
                  value={lengthM}
                  onChange={(e) => setLengthM(parseFloat(e.target.value))}
                  className="w-full accent-sky-400 cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span>Gravity</span>
                  <span className="font-mono text-sky-300 tabular-nums">{gravity.toFixed(1)} m/s²</span>
                </div>
                <input
                  type="range"
                  min="1.6"
                  max="20"
                  step="0.2"
                  value={gravity}
                  onChange={(e) => setGravity(parseFloat(e.target.value))}
                  className="w-full accent-sky-400 cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span>Air Damping</span>
                  <span className="font-mono text-sky-300 tabular-nums">{damping.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="0.25"
                  step="0.01"
                  value={damping}
                  onChange={(e) => setDamping(parseFloat(e.target.value))}
                  className="w-full accent-sky-400 cursor-pointer"
                />
              </div>
            </div>
          )}

          {activeLab === 'waves' && (
            <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-white/10 space-y-2.5 text-xs">
              <p className="text-[11px] font-mono text-sky-300">
                Δr = nλ (Constructive) · Δr = (n + ½)λ (Destructive)
              </p>
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span>Wave Frequency</span>
                  <span className="font-mono text-sky-300 tabular-nums">{waveFreqHz.toFixed(1)} Hz</span>
                </div>
                <input
                  type="range"
                  min="1.0"
                  max="4.5"
                  step="0.1"
                  value={waveFreqHz}
                  onChange={(e) => setWaveFreqHz(parseFloat(e.target.value))}
                  className="w-full accent-sky-400 cursor-pointer"
                />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span>Source Separation</span>
                  <span className="font-mono text-sky-300 tabular-nums">{slitSepPx} px</span>
                </div>
                <input
                  type="range"
                  min="16"
                  max="110"
                  step="2"
                  value={slitSepPx}
                  onChange={(e) => setSlitSepPx(parseInt(e.target.value, 10))}
                  className="w-full accent-sky-400 cursor-pointer"
                />
              </div>
            </div>
          )}

          {activeLab === 'logic' && (
            <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-white/10 text-[11px] text-slate-300 space-y-1">
              <span className="font-bold text-white block">Interactive Boolean Hardware Lab</span>
              <p>
                Toggle inputs A and B to verify how {gateType} gates compute binary decisions inside processors.
              </p>
            </div>
          )}
        </div>
      ) : (
        /* Adaptive Socratic AI Tutor */
        <div className="space-y-3 flex-1">
          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-white/10 space-y-2.5">
            <span className="text-xs font-semibold text-white block">
              Learn any concept interactively
            </span>
            <div className="flex gap-2">
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAskTutor()}
                placeholder="Topic (e.g. Entropy, Public-Key Crypto, Photosynthesis)"
                className="flex-1 min-h-[40px] px-3 rounded-xl bg-slate-950 border border-white/10 text-xs text-white focus:outline-none focus:border-sky-400"
              />
              <button
                onClick={() => handleAskTutor()}
                disabled={!topic.trim() || isLoadingTutor}
                className="min-h-[40px] px-4 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-40 text-slate-950 font-bold text-xs cursor-pointer"
              >
                {isLoadingTutor ? 'Thinking...' : 'Teach'}
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {['Wave Interference', 'Public-Key Encryption', 'Harmonic Motion'].map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    setTopic(t);
                    handleAskTutor(t);
                  }}
                  className="min-h-[30px] px-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] text-slate-300 cursor-pointer"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {tutorData ? (
            <div className="p-3.5 rounded-2xl bg-slate-900/85 border border-white/10 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sky-300 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4" />
                  {topic}
                </span>
                <button
                  onClick={handleSaveLessonToKnowledge}
                  className="min-h-[30px] px-2.5 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-400/40 text-indigo-200 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <BookmarkPlus className="w-3.5 h-3.5" />
                  <span>{savedNotice ? 'Saved' : 'Save to Knowledge'}</span>
                </button>
              </div>

              <p className="text-slate-200 leading-relaxed">{tutorData.explanation}</p>

              <div className="p-2.5 rounded-xl bg-slate-950 border border-white/10 font-mono text-[11px] text-emerald-300">
                {tutorData.keyPrinciple}
              </div>

              <p className="text-[11px] text-slate-300">
                <strong className="text-white">Experiment:</strong> {tutorData.practicePrompt}
              </p>

              <div className="pt-2 border-t border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white">Concept Check</span>
                  <button
                    onClick={() => setShowHint(!showHint)}
                    className="text-[11px] text-sky-400 hover:underline cursor-pointer"
                  >
                    {showHint ? 'Hide Hint' : 'Need Hint?'}
                  </button>
                </div>

                {showHint && (
                  <p className="text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/20 p-2 rounded-lg">
                    {tutorData.hint}
                  </p>
                )}

                <p className="text-slate-200">{tutorData.quizQuestion}</p>
                <div className="space-y-1.5">
                  {tutorData.quizOptions.map((opt, idx) => {
                    const isPicked = selectedQuizIdx === idx;
                    const isCorrect = idx === tutorData.correctIndex;
                    return (
                      <button
                        key={idx}
                        onClick={() => setSelectedQuizIdx(idx)}
                        className={`w-full min-h-[38px] p-2.5 rounded-xl border text-left text-[11px] flex items-center justify-between gap-2 cursor-pointer ${
                          isPicked
                            ? isCorrect
                              ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                              : 'bg-rose-500/20 border-rose-400 text-rose-200'
                            : 'bg-slate-950 border-white/10 text-slate-300 hover:border-white/25'
                        }`}
                      >
                        <span>{opt}</span>
                        {isPicked &&
                          (isCorrect ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          ) : (
                            <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                          ))}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-slate-900/40 border border-white/10 text-center text-xs text-slate-400">
              Enter any subject above to start an interactive Socratic lesson with concept checks.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
