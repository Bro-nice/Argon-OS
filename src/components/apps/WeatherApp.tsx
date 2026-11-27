import React, { useState } from 'react';
import { CloudSun, Wind, Droplets, MapPin, Search, RefreshCw } from 'lucide-react';
import { HardwareState, PrivacyProfile } from '../../types/os';
import { syncHostGeolocation, triggerHaptic } from '../../utils/hardware';

interface WeatherAppProps {
  hardware: HardwareState;
  privacy: PrivacyProfile;
  onUpdateHardware: (partial: Partial<HardwareState>) => void;
}

interface WeatherCity {
  name: string;
  tempF: number;
  condition: string;
  highF: number;
  lowF: number;
  humidity: number;
  windMph: number;
  hourlyF: { hour: string; tempF: number }[];
}

const OFFLINE_CITIES: WeatherCity[] = [
  {
    name: 'Local Device Zone',
    tempF: 70,
    condition: 'Clear · Host Timezone Synced',
    highF: 75,
    lowF: 57,
    humidity: 58,
    windMph: 9,
    hourlyF: [
      { hour: 'Now', tempF: 70 },
      { hour: '+1h', tempF: 71 },
      { hour: '+2h', tempF: 73 },
      { hour: '+3h', tempF: 75 },
      { hour: '+4h', tempF: 72 },
      { hour: '+5h', tempF: 68 },
    ],
  },
  {
    name: 'San Francisco',
    tempF: 64,
    condition: 'Coastal Breeze',
    highF: 68,
    lowF: 54,
    humidity: 68,
    windMph: 14,
    hourlyF: [
      { hour: 'Now', tempF: 64 },
      { hour: '+1h', tempF: 66 },
      { hour: '+2h', tempF: 68 },
      { hour: '+3h', tempF: 67 },
      { hour: '+4h', tempF: 63 },
      { hour: '+5h', tempF: 59 },
    ],
  },
  {
    name: 'London',
    tempF: 57,
    condition: 'Overcast',
    highF: 61,
    lowF: 48,
    humidity: 79,
    windMph: 15,
    hourlyF: [
      { hour: 'Now', tempF: 57 },
      { hour: '+1h', tempF: 59 },
      { hour: '+2h', tempF: 61 },
      { hour: '+3h', tempF: 60 },
      { hour: '+4h', tempF: 56 },
      { hour: '+5h', tempF: 52 },
    ],
  },
  {
    name: 'Tokyo',
    tempF: 69,
    condition: 'Clear & Crisp',
    highF: 73,
    lowF: 56,
    humidity: 52,
    windMph: 8,
    hourlyF: [
      { hour: 'Now', tempF: 69 },
      { hour: '+1h', tempF: 71 },
      { hour: '+2h', tempF: 73 },
      { hour: '+3h', tempF: 72 },
      { hour: '+4h', tempF: 68 },
      { hour: '+5h', tempF: 64 },
    ],
  },
];

function decodeWmoCode(code: number): string {
  if (code === 0) return 'Clear Sky';
  if (code <= 3) return 'Partly Cloudy';
  if (code <= 48) return 'Foggy';
  if (code <= 57) return 'Drizzle';
  if (code <= 67) return 'Rain';
  if (code <= 77) return 'Snow';
  if (code <= 82) return 'Rain Showers';
  return 'Thunderstorm';
}

export const WeatherApp: React.FC<WeatherAppProps> = ({
  hardware,
  privacy,
  onUpdateHardware,
}) => {
  const [unit, setUnit] = useState<'C' | 'F'>('C');
  const [selectedCityIdx, setSelectedCityIdx] = useState(0);
  const [liveCity, setLiveCity] = useState<WeatherCity | null>(null);
  const [searchCity, setSearchCity] = useState('');
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(false);

  const activeCity = liveCity || OFFLINE_CITIES[selectedCityIdx];
  const displayCityName =
    liveCity
      ? liveCity.name
      : selectedCityIdx === 0
      ? hardware.geolocationCity || hardware.hostTimezone
      : activeCity.name;

  const formatTemp = (tempF: number) =>
    unit === 'F' ? Math.round(tempF) : Math.round(((tempF - 32) * 5) / 9);

  const fetchOpenMeteoByCoords = async (lat: number, lon: number, label: string) => {
    setIsFetching(true);
    setStatusMsg(null);
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&hourly=temperature_2m&temperature_unit=fahrenheit&wind_speed_unit=mph&forecast_days=1`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Forecast unavailable');
      const data = await res.json();
      const curr = data.current;
      const hourlyTemps: number[] = data.hourly?.temperature_2m || [];
      const currentHour = new Date().getHours();
      const slice = hourlyTemps.slice(currentHour, currentHour + 6);
      const hourlyF = (slice.length > 0 ? slice : [curr.temperature_2m]).map((t, idx) => ({
        hour: idx === 0 ? 'Now' : `+${idx}h`,
        tempF: Math.round(t),
      }));

      setLiveCity({
        name: label,
        tempF: Math.round(curr.temperature_2m),
        condition: `${decodeWmoCode(curr.weather_code)} · Live`,
        highF: Math.round(Math.max(...(hourlyTemps.length ? hourlyTemps : [curr.temperature_2m]))),
        lowF: Math.round(Math.min(...(hourlyTemps.length ? hourlyTemps : [curr.temperature_2m]))),
        humidity: Math.round(curr.relative_humidity_2m),
        windMph: Math.round(curr.wind_speed_10m),
        hourlyF,
      });
    } catch {
      setStatusMsg('Live weather unreachable; showing local baseline forecast.');
    } finally {
      setIsFetching(false);
    }
  };

  const handleSearchCity = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchCity.trim();
    if (!q) return;
    triggerHaptic(10);

    if (privacy.localOnlyAirGap) {
      const matchIdx = OFFLINE_CITIES.findIndex((c) =>
        c.name.toLowerCase().includes(q.toLowerCase())
      );
      if (matchIdx >= 0) {
        setLiveCity(null);
        setSelectedCityIdx(matchIdx);
        setStatusMsg(null);
      } else {
        setStatusMsg('Air-Gap active: external city lookup blocked.');
      }
      return;
    }

    setIsFetching(true);
    setStatusMsg(null);
    try {
      const geoRes = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
          q
        )}&count=1&language=en&format=json`
      );
      const geoData = await geoRes.json();
      const hit = geoData.results?.[0];
      if (!hit) {
        setStatusMsg(`City "${q}" not found.`);
        setIsFetching(false);
        return;
      }
      const label = `${hit.name}${hit.country_code ? `, ${hit.country_code}` : ''}`;
      await fetchOpenMeteoByCoords(hit.latitude, hit.longitude, label);
    } catch {
      setStatusMsg('City lookup unreachable offline.');
      setIsFetching(false);
    }
  };

  const handleSyncHardwareGps = async () => {
    triggerHaptic(15);
    setIsFetching(true);
    const geo = await syncHostGeolocation();
    if (geo) {
      onUpdateHardware({
        geolocationCoords: geo.coords,
        geolocationCity: geo.city,
        locationOn: true,
      });
      if (!privacy.localOnlyAirGap) {
        const [latStr, lonStr] = geo.coords.split(',').map((s) => parseFloat(s.trim()));
        if (Number.isFinite(latStr) && Number.isFinite(lonStr)) {
          await fetchOpenMeteoByCoords(latStr, lonStr, geo.city);
          return;
        }
      }
    }
    setLiveCity(null);
    setSelectedCityIdx(0);
    setIsFetching(false);
  };

  return (
    <div className="flex-1 w-full h-full bg-slate-950 text-white flex flex-col p-4 select-none overflow-y-auto space-y-4">
      <div className="max-w-2xl w-full mx-auto space-y-4">
        {/* Search & Unit Controls */}
        <div className="flex items-center gap-2">
          <form onSubmit={handleSearchCity} className="flex-1 flex items-center gap-1.5">
            <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900 border border-white/10 focus-within:border-cyan-400">
              <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <input
                type="text"
                value={searchCity}
                onChange={(e) => setSearchCity(e.target.value)}
                placeholder="Search any city (e.g. Berlin, Mumbai, Seattle)..."
                className="flex-1 bg-transparent text-xs text-white placeholder:text-slate-500 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={isFetching}
              className="px-3 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs cursor-pointer disabled:opacity-50"
            >
              Go
            </button>
          </form>

          <button
            onClick={() => setUnit((u) => (u === 'C' ? 'F' : 'C'))}
            className="px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-xs font-mono font-bold text-cyan-300 hover:bg-slate-800 cursor-pointer"
            title="Toggle °C / °F"
          >
            °{unit}
          </button>
        </div>

        {statusMsg && (
          <div className="px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200">
            {statusMsg}
          </div>
        )}

        {/* Main Weather Card */}
        <div className="p-5 rounded-2xl bg-gradient-to-b from-cyan-950/50 to-slate-900 border border-white/10 text-center space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <button
              onClick={() => {
                setLiveCity(null);
                setSelectedCityIdx((selectedCityIdx + 1) % OFFLINE_CITIES.length);
              }}
              className="font-mono text-cyan-300 hover:text-cyan-200 cursor-pointer"
            >
              Cycle Preset Cities
            </button>
            <button
              onClick={handleSyncHardwareGps}
              className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 cursor-pointer"
            >
              {isFetching ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <MapPin className="w-3.5 h-3.5" />
              )}
              <span>{isFetching ? 'Syncing...' : 'Sync GPS'}</span>
            </button>
          </div>

          <h1 className="text-xl font-bold text-white truncate">{displayCityName}</h1>
          <div className="flex items-center justify-center gap-3">
            <CloudSun className="w-12 h-12 text-amber-400" />
            <span className="text-5xl font-bold tabular-nums tracking-tight text-white">
              {formatTemp(activeCity.tempF)}°{unit}
            </span>
          </div>

          <p className="text-xs font-medium text-cyan-200">
            {activeCity.condition} · H {formatTemp(activeCity.highF)}° / L {formatTemp(activeCity.lowF)}°
          </p>
          <p className="text-[11px] text-slate-400 font-mono">
            {privacy.localOnlyAirGap
              ? 'Air-Gapped Local Mode · Zero External Calls'
              : hardware.locationOn
              ? `GPS: ${hardware.geolocationCoords}`
              : `Timezone: ${hardware.hostTimezone}`}
          </p>
        </div>

        {/* Hourly Forecast */}
        <div className="space-y-2">
          <span className="text-xs font-semibold text-slate-400">Hourly Trajectory</span>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {activeCity.hourlyF.map((h, i) => (
              <div
                key={i}
                className="p-3 rounded-xl bg-slate-900 border border-white/10 text-center space-y-1"
              >
                <span className="text-[10px] text-slate-400 font-mono block">{h.hour}</span>
                <CloudSun className="w-4 h-4 text-amber-400 mx-auto" />
                <span className="text-xs font-bold text-white tabular-nums">
                  {formatTemp(h.tempF)}°
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="p-3.5 rounded-xl bg-slate-900 border border-white/10 flex items-center gap-3">
            <Droplets className="w-5 h-5 text-cyan-400" />
            <div>
              <span className="text-[10px] text-slate-400 block font-mono">Humidity</span>
              <span className="text-sm font-bold text-white tabular-nums">{activeCity.humidity}%</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900 border border-white/10 flex items-center gap-3">
            <Wind className="w-5 h-5 text-emerald-400" />
            <div>
              <span className="text-[10px] text-slate-400 block font-mono">Wind Speed</span>
              <span className="text-sm font-bold text-white tabular-nums">
                {unit === 'C'
                  ? `${Math.round(activeCity.windMph * 1.609)} km/h`
                  : `${activeCity.windMph} mph`}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
