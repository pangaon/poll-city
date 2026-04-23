"use client";

import { useEffect, useState } from "react";
import { CloudRain, Sun, Cloud, CloudSnow, Wind, Zap, Droplets, Eye, EyeOff } from "lucide-react";

interface DayForecast {
  date: string;
  high: number;
  low: number;
  precipProb: number;
  code: number;
}

interface WeatherData {
  temp: number;
  precipProb: number;
  code: number;
  city: string;
  days: DayForecast[];
}

const WMO_LABELS: Record<number, string> = {
  0: "Clear", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
  45: "Fog", 48: "Icy fog",
  51: "Light drizzle", 53: "Drizzle", 55: "Heavy drizzle",
  61: "Light rain", 63: "Rain", 65: "Heavy rain",
  71: "Light snow", 73: "Snow", 75: "Heavy snow",
  80: "Showers", 81: "Showers", 82: "Heavy showers",
  95: "Thunderstorm", 99: "Hail storm",
};

function weatherIcon(code: number, className = "w-5 h-5") {
  if (code === 0 || code === 1) return <Sun className={className} />;
  if (code <= 3) return <Cloud className={className} />;
  if (code >= 61 && code <= 82) return <CloudRain className={className} />;
  if (code >= 71 && code <= 75) return <CloudSnow className={className} />;
  if (code >= 95) return <Zap className={className} />;
  return <Wind className={className} />;
}

function weatherColor(code: number): string {
  if (code === 0 || code === 1) return "text-amber-500";
  if (code <= 3) return "text-gray-400";
  if (code >= 61) return "text-blue-500";
  if (code >= 71) return "text-sky-400";
  if (code >= 95) return "text-purple-500";
  return "text-gray-400";
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

async function fetchWeather(lat: number, lon: number): Promise<WeatherData> {
  const [weatherRes, geoRes] = await Promise.all([
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current_weather=true&hourly=precipitation_probability,temperature_2m,weathercode` +
      `&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode` +
      `&timezone=auto&forecast_days=3`,
    ),
    fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
      { headers: { "User-Agent": "PollCity/1.0 (contact@poll.city)" } },
    ),
  ]);

  const weather = await weatherRes.json();
  const geo = await geoRes.json();

  const city =
    geo?.address?.city ??
    geo?.address?.town ??
    geo?.address?.village ??
    geo?.address?.county ??
    "Your location";

  const current = weather.current_weather;
  const daily = weather.daily;

  const days: DayForecast[] = (daily?.time ?? []).map((dateStr: string, i: number) => ({
    date: dateStr,
    high: Math.round(daily.temperature_2m_max[i]),
    low: Math.round(daily.temperature_2m_min[i]),
    precipProb: daily.precipitation_probability_max[i] ?? 0,
    code: daily.weathercode[i],
  }));

  // Current hour precipitation probability
  const nowHour = new Date().getHours();
  const precipProb = weather.hourly?.precipitation_probability?.[nowHour] ?? 0;

  return {
    temp: Math.round(current.temperature),
    precipProb,
    code: current.weathercode,
    city,
    days,
  };
}

export default function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError("Geolocation not supported");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const data = await fetchWeather(pos.coords.latitude, pos.coords.longitude);
          setWeather(data);
        } catch {
          setError("Weather unavailable");
        } finally {
          setLoading(false);
        }
      },
      () => {
        setDenied(true);
        setLoading(false);
      },
      { timeout: 8000 },
    );
  }, []);

  if (loading) {
    return (
      <div className="h-14 rounded-xl border border-gray-100 bg-white animate-pulse" />
    );
  }

  if (denied) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-gray-100 bg-white px-4 py-3 text-xs text-gray-400">
        <EyeOff className="w-3.5 h-3.5" />
        Enable location to see canvassing weather
      </div>
    );
  }

  if (error || !weather) return null;

  const label = WMO_LABELS[weather.code] ?? "Unknown";
  const iconColor = weatherColor(weather.code);
  const isGoodForCanvassing = weather.code <= 3 && weather.precipProb < 30;

  return (
    <div className="rounded-xl border border-gray-100 bg-white overflow-hidden">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
      >
        <span className={iconColor}>
          {weatherIcon(weather.code, "w-6 h-6")}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900">
            {weather.temp}°C · {label}
          </p>
          <p className="text-xs text-gray-400 truncate">{weather.city}</p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          {weather.precipProb > 0 && (
            <span className="flex items-center gap-1 text-blue-500">
              <Droplets className="w-3.5 h-3.5" />
              {weather.precipProb}%
            </span>
          )}
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
              isGoodForCanvassing
                ? "bg-green-100 text-green-700"
                : "bg-amber-100 text-amber-700"
            }`}
          >
            {isGoodForCanvassing ? "Good for canvassing" : "Check conditions"}
          </span>
          <Eye className="w-3.5 h-3.5 text-gray-300" />
        </div>
      </button>

      {expanded && weather.days.length > 0 && (
        <div className="border-t border-gray-100 grid grid-cols-3 divide-x divide-gray-100">
          {weather.days.map((day) => {
            const d = new Date(day.date + "T12:00:00");
            const dayName = DAY_NAMES[d.getDay()];
            const ic = weatherColor(day.code);
            return (
              <div key={day.date} className="px-3 py-2.5 text-center">
                <p className="text-[11px] font-medium text-gray-500">{dayName}</p>
                <span className={`inline-block my-1 ${ic}`}>
                  {weatherIcon(day.code, "w-4 h-4 mx-auto")}
                </span>
                <p className="text-xs font-semibold text-gray-800">{day.high}° / {day.low}°</p>
                {day.precipProb > 0 && (
                  <p className="text-[10px] text-blue-400">{day.precipProb}% rain</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
