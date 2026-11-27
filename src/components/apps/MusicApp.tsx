import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Heart,
  Disc3,
} from 'lucide-react';
import { MusicTrack } from '../../types/os';
import { startAmbientAudioStream, triggerHaptic } from '../../utils/hardware';

interface ExtendedTrack extends MusicTrack {
  frequencyHz: number;
}

const PLAYLIST: ExtendedTrack[] = [
  {
    id: 't1',
    title: 'Horizon Frequency (432Hz)',
    artist: 'Human Sound Lab',
    durationSec: 214,
    coverGradient: 'from-cyan-500 to-blue-600',
    genre: 'Ambient Harmonic',
    frequencyHz: 432,
  },
  {
    id: 't2',
    title: 'Cybernetic Dusk (396Hz)',
    artist: 'Neural Synthetics',
    durationSec: 185,
    coverGradient: 'from-violet-500 to-indigo-700',
    genre: 'Synth Pad',
    frequencyHz: 396,
  },
  {
    id: 't3',
    title: 'Solar Dune Wind (528Hz)',
    artist: 'Sovereign Audio',
    durationSec: 240,
    coverGradient: 'from-amber-500 to-rose-600',
    genre: 'Focus Soundscape',
    frequencyHz: 528,
  },
];

interface MusicAppProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  onTrackChange?: (title: string) => void;
}

export const MusicApp: React.FC<MusicAppProps> = ({
  isPlaying,
  onTogglePlay,
  onTrackChange,
}) => {
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [playbackSeconds, setPlaybackSeconds] = useState(0);
  const [likedIds, setLikedIds] = useState<Record<string, boolean>>({});
  const [shuffle, setShuffle] = useState(false);
  const [repeatOne, setRepeatOne] = useState(false);

  const track = PLAYLIST[currentTrackIndex];
  const isLiked = Boolean(likedIds[track.id]);

  const switchTrack = (nextIdx: number) => {
    setCurrentTrackIndex(nextIdx);
    setPlaybackSeconds(0);
    const chosen = PLAYLIST[nextIdx];
    if (onTrackChange) onTrackChange(chosen.title);
    if (isPlaying) {
      startAmbientAudioStream(chosen.frequencyHz);
    }
  };

  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      setPlaybackSeconds((prev) => {
        if (prev + 1 >= track.durationSec) {
          if (repeatOne) return 0;
          const nextIdx = shuffle
            ? Math.floor(Math.random() * PLAYLIST.length)
            : (currentTrackIndex + 1) % PLAYLIST.length;
          setTimeout(() => switchTrack(nextIdx), 0);
          return 0;
        }
        return prev + 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  });

  const handleNext = () => {
    triggerHaptic(15);
    const nextIdx = shuffle
      ? Math.floor(Math.random() * PLAYLIST.length)
      : (currentTrackIndex + 1) % PLAYLIST.length;
    switchTrack(nextIdx);
  };

  const handlePrev = () => {
    triggerHaptic(15);
    const prevIdx = (currentTrackIndex - 1 + PLAYLIST.length) % PLAYLIST.length;
    switchTrack(prevIdx);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="flex-1 w-full h-full bg-[#0b0f17] text-white flex flex-col justify-between p-5 select-none overflow-y-auto">
      <div className="flex items-center justify-between pb-2 border-b border-white/10 text-xs">
        <span className="font-mono text-cyan-400 uppercase tracking-wider font-semibold">
          Local Harmonic Audio
        </span>
        <span className="text-slate-400 font-mono">{track.frequencyHz} Hz Synth</span>
      </div>

      {/* Album Artwork */}
      <div className="my-auto flex flex-col items-center justify-center space-y-4 py-3">
        <div
          className={`relative w-40 h-40 rounded-3xl bg-gradient-to-tr ${track.coverGradient} shadow-2xl flex items-center justify-center p-4 border border-white/20`}
        >
          <Disc3
            className={`w-20 h-20 text-white/90 ${isPlaying ? 'animate-spin' : ''}`}
            style={{ animationDuration: '6s' }}
          />
        </div>

        <div className="text-center space-y-1">
          <h2 className="text-base font-bold text-white tracking-tight">{track.title}</h2>
          <p className="text-xs text-slate-400 font-medium">
            {track.artist} · {track.genre}
          </p>
        </div>

        {/* Selectable Track List */}
        <div className="w-full max-w-sm space-y-1">
          {PLAYLIST.map((t, i) => (
            <button
              key={t.id}
              onClick={() => switchTrack(i)}
              className={`w-full px-3 py-2 rounded-xl text-left text-xs flex items-center justify-between cursor-pointer border ${
                i === currentTrackIndex
                  ? 'bg-cyan-500/15 border-cyan-500/40 text-white font-semibold'
                  : 'bg-slate-900/60 border-white/5 text-slate-400 hover:text-white'
              }`}
            >
              <span className="truncate">{t.title}</span>
              <span className="font-mono text-[10px] tabular-nums">{formatTime(t.durationSec)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Seekable Progress Scrubber */}
      <div className="space-y-1.5 pt-2 max-w-sm mx-auto w-full">
        <input
          type="range"
          min="0"
          max={track.durationSec}
          value={playbackSeconds}
          onChange={(e) => setPlaybackSeconds(parseInt(e.target.value, 10))}
          className="w-full accent-cyan-400 cursor-pointer"
        />
        <div className="flex justify-between text-[10px] text-slate-400 font-mono tabular-nums">
          <span>{formatTime(playbackSeconds)}</span>
          <span>{formatTime(track.durationSec)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-around py-2 max-w-sm mx-auto w-full">
        <button
          onClick={() => setLikedIds((prev) => ({ ...prev, [track.id]: !prev[track.id] }))}
          className={`p-2 transition-colors cursor-pointer ${
            isLiked ? 'text-rose-500' : 'text-slate-400 hover:text-white'
          }`}
          title="Favorite"
        >
          <Heart className={`w-5 h-5 ${isLiked ? 'fill-rose-500' : ''}`} />
        </button>

        <button
          onClick={handlePrev}
          className="p-2 text-slate-300 hover:text-white transition-colors cursor-pointer"
          title="Previous Track"
        >
          <SkipBack className="w-5 h-5" />
        </button>

        <button
          onClick={() => {
            if (!isPlaying) startAmbientAudioStream(track.frequencyHz);
            onTogglePlay();
          }}
          className="w-13 h-13 rounded-full bg-cyan-400 hover:bg-cyan-300 text-slate-950 flex items-center justify-center shadow-xl transition-transform active:scale-90 cursor-pointer"
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <Pause className="w-5 h-5 fill-slate-950" />
          ) : (
            <Play className="w-5 h-5 ml-0.5 fill-slate-950" />
          )}
        </button>

        <button
          onClick={handleNext}
          className="p-2 text-slate-300 hover:text-white transition-colors cursor-pointer"
          title="Next Track"
        >
          <SkipForward className="w-5 h-5" />
        </button>

        <button
          onClick={() => setShuffle(!shuffle)}
          className={`p-2 transition-colors cursor-pointer ${
            shuffle ? 'text-cyan-400' : 'text-slate-400 hover:text-white'
          }`}
          title="Shuffle"
        >
          <Shuffle className="w-4 h-4" />
        </button>

        <button
          onClick={() => setRepeatOne(!repeatOne)}
          className={`p-2 transition-colors cursor-pointer ${
            repeatOne ? 'text-emerald-400' : 'text-slate-400 hover:text-white'
          }`}
          title="Repeat Track"
        >
          <Repeat className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
