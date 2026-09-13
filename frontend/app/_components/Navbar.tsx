"use client";
import React, { useEffect, useState } from "react";
import { useAuthStore } from "@/lib/store/useAuthStore";

type CityKey = "hanoi" | "hcmc";

type WeatherPayload = {
  city: CityKey;
  locationName: string;
  country: string;
  temperature: number | null;
  description: string;
  weatherCode: number | null;
  isDay: "yes" | "no";
};

const CITY_OPTIONS: Array<{ value: CityKey; label: string }> = [
  { value: "hanoi", label: "Ha Noi" },
  { value: "hcmc", label: "TP.HCM" }
];

const SHORT_CITY_LABEL: Record<CityKey, string> = {
  hanoi: "HN",
  hcmc: "HCM"
};

const translateWeatherDescription = (description: string, isDay: "yes" | "no"): string => {
  const normalized = description.toLowerCase();
  if (/(thunder|storm)/.test(normalized)) return "Mưa dông";
  if (/(heavy rain|torrential)/.test(normalized)) return "Mưa lớn";
  if (/(rain|drizzle|shower)/.test(normalized)) return "Mưa";
  if (/(partly cloudy)/.test(normalized)) return "Có mây";
  if (/(cloud|overcast)/.test(normalized)) return "Nhiều mây";
  if (/(fog|mist|haze)/.test(normalized)) return "Sương mù";
  if (/(clear|sunny)/.test(normalized)) return isDay === "no" ? "Troi quang dem" : "Troi quang";
  if (/(snow|sleet|hail)/.test(normalized)) return "Tuyết";
  if (/(wind|breeze|gust)/.test(normalized)) return "Gió mạnh";
  return "Thời tiết ổn định";
};

export default function Navbar() {
  const { user } = useAuthStore();
  const [city, setCity] = useState<CityKey>("hanoi");
  const [weather, setWeather] = useState<WeatherPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [isCompactSelect, setIsCompactSelect] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 640px)");
    const syncCompact = () => setIsCompactSelect(mediaQuery.matches);
    syncCompact();
    mediaQuery.addEventListener("change", syncCompact);
    return () => mediaQuery.removeEventListener("change", syncCompact);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const fetchWeather = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/weather?city=${city}`, {
          signal: controller.signal,
          cache: "no-store"
        });
        if (!res.ok) throw new Error("Weather fetch failed");
        const data = (await res.json()) as WeatherPayload;
        setWeather(data);
      } catch {
        if (!controller.signal.aborted) {
          setWeather(null);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchWeather();
    return () => controller.abort();
  }, [city]);

  const localizedDescription = weather ? translateWeatherDescription(weather.description, weather.isDay) : "";

  return (
    <nav aria-label="Z4rum" className="pt-[env(safe-area-inset-top)] sticky top-0 z-40 border-b border-neutral-800 bg-[#101010]">
      <div className="mx-auto flex h-14 max-w-[1280px] items-center justify-between gap-3 px-4">
        <a href="/home" className="flex items-baseline gap-3">
          <span className="text-2xl font-black tracking-tighter">Z4rum<span className="text-blue-500">.</span></span>
          <span className="hidden sm:inline text-xs text-neutral-400">Chỗ anh em lên tiếng.</span>
        </a>
        <div className="flex items-center gap-3 text-xs text-neutral-400">
          <label className="sr-only" htmlFor="weather-city-select">Thành phố</label>
          <select id="weather-city-select" value={city} onChange={(e) => setCity(e.target.value as CityKey)} className="bg-[#101010] py-2 text-neutral-300">
            {CITY_OPTIONS.map((item) => <option key={item.value} value={item.value}>{isCompactSelect ? SHORT_CITY_LABEL[item.value] : item.label}</option>)}
          </select>
          <span title={localizedDescription}>{loading ? "…" : weather?.temperature != null ? `${weather.temperature}°C` : "—"}</span>
          {user?.avatarUrl && <img src={user.avatarUrl} alt={user.username} className="h-7 w-7 rounded-sm object-cover" />}
        </div>
      </div>
    </nav>
  );
}
