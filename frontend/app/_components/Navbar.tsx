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

type SceneType = "sunny" | "cloudy" | "rainy" | "storm" | "night";

const CITY_OPTIONS: Array<{ value: CityKey; label: string }> = [
  { value: "hanoi", label: "Ha Noi" },
  { value: "hcmc", label: "TP.HCM" }
];

const SHORT_CITY_LABEL: Record<CityKey, string> = {
  hanoi: "HN",
  hcmc: "HCM"
};

const pickScene = (description: string, isDay: "yes" | "no"): SceneType => {
  const normalized = description.toLowerCase();
  if (/(thunder|storm)/.test(normalized)) return "storm";
  if (/(rain|drizzle|shower)/.test(normalized)) return "rainy";
  if (/(cloud|overcast|fog|mist|haze)/.test(normalized)) return "cloudy";
  if (isDay === "no") return "night";
  return "sunny";
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

  const scene = weather ? pickScene(weather.description, weather.isDay) : "sunny";
  const localizedDescription = weather ? translateWeatherDescription(weather.description, weather.isDay) : "";

  return (
    <nav className="w-full bg-gradient-to-br from-[#0a1628] to-[#071029] border-b border-[#1e293b] sticky top-0 z-40">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} className="w-10 h-10 rounded-xl object-cover ring-2 ring-[#1e3a52]" alt="avatar" />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#3B82F6] via-[#6366F1] to-[#8B5CF6] flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-blue-500/30">
                Z
              </div>
            )}
            <div>
              <h1 className="text-white text-lg font-bold tracking-tight">Z4rum</h1>
              {user ? <div className="text-[#94a3b8] text-xs">Người dùng: {user.username}</div> : <div className="text-[#94a3b8] text-xs">Welcome</div>}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="sr-only" htmlFor="weather-city-select">Chon thanh pho thoi tiet</label>
            <div className="weather-select-wrap">
              <select
                id="weather-city-select"
                value={city}
                onChange={(e) => setCity(e.target.value as CityKey)}
                className="weather-select"
              >
                {CITY_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {isCompactSelect ? SHORT_CITY_LABEL[item.value] : item.label}
                  </option>
                ))}
              </select>
              <span className="weather-select-chevron" aria-hidden="true" />
            </div>

            {weather && (
              <div className="hidden md:block text-[9px] text-slate-200/75 uppercase tracking-wide max-w-[72px] lg:max-w-[96px] truncate" title={localizedDescription}>
                {localizedDescription}
              </div>
            )}

            <div className="relative w-[108px] sm:w-[124px] md:w-[138px] h-10 shrink-0 overflow-hidden rounded-full border border-white/10 bg-[#060c1d]/80" title={weather ? `${weather.locationName}: ${localizedDescription}` : "Dang tai thoi tiet"}>
              {scene === "sunny" && (
                <div className="absolute inset-0 sun-scene" aria-label="Sunny animation">
                  <div className="sun-orb" />
                  <span className="sun-ray sun-ray-1" />
                  <span className="sun-ray sun-ray-2" />
                  <span className="sun-ray sun-ray-3" />
                  <span className="sun-ray sun-ray-4" />
                  <span className="sun-glow" />
                </div>
              )}

              {scene === "night" && (
                <div className="absolute inset-0 moon-scene" aria-label="Night animation">
                  <div className="moon-orb" />
                  <span className="moon-crater moon-crater-1" />
                  <span className="moon-crater moon-crater-2" />
                  <span className="moon-crater moon-crater-3" />
                  <span className="shooting-star shooting-star-1" />
                  <span className="shooting-star shooting-star-2" />
                </div>
              )}

              {scene === "cloudy" && (
                <div className="absolute inset-0 cloudy-scene" aria-label="Cloudy animation">
                  <span className="cloud cloud-1" />
                  <span className="cloud cloud-2" />
                  <span className="cloud cloud-3" />
                </div>
              )}

              {scene === "rainy" && (
                <div className="absolute inset-0 rainy-scene" aria-label="Rain animation">
                  <span className="cloud cloud-2" />
                  <span className="cloud cloud-3" />
                  <span className="rain rain-1" />
                  <span className="rain rain-2" />
                  <span className="rain rain-3" />
                  <span className="rain rain-4" />
                </div>
              )}

              {scene === "storm" && (
                <div className="absolute inset-0 storm-scene" aria-label="Storm animation">
                  <span className="cloud cloud-1" />
                  <span className="cloud cloud-2" />
                  <span className="rain rain-2" />
                  <span className="rain rain-3" />
                  <span className="rain rain-4" />
                  <span className="lightning" />
                </div>
              )}

              <div className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-100/90 font-semibold">
                {loading
                  ? "..."
                  : weather?.temperature !== null && weather?.temperature !== undefined
                    ? `${weather.temperature}C`
                    : "--"}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .weather-select-wrap {
          position: relative;
          height: 36px;
          border-radius: 10px;
          border: 1px solid rgba(148, 163, 184, 0.28);
          background: linear-gradient(145deg, rgba(15, 23, 42, 0.58), rgba(15, 23, 42, 0.28));
          backdrop-filter: blur(10px);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12), 0 8px 24px rgba(2, 6, 23, 0.35);
          transition: border-color 180ms ease, box-shadow 180ms ease, transform 180ms ease;
        }

        .weather-select-wrap:focus-within {
          border-color: rgba(125, 211, 252, 0.95);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.16), 0 0 0 3px rgba(56, 189, 248, 0.18), 0 10px 24px rgba(2, 6, 23, 0.5);
          transform: translateY(-1px);
        }

        .weather-select {
          height: 100%;
          min-width: 98px;
          padding: 0 30px 0 10px;
          border: 0;
          border-radius: 10px;
          color: rgb(226, 232, 240);
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          background: transparent;
          appearance: none;
          outline: none;
          cursor: pointer;
        }

        @media (max-width: 640px) {
          .weather-select {
            min-width: 66px;
            font-size: 10px;
            padding: 0 24px 0 8px;
          }

          .weather-select-chevron {
            right: 8px;
          }
        }

        .weather-select option {
          background: #0f172a;
          color: #e2e8f0;
        }

        .weather-select-chevron {
          position: absolute;
          right: 10px;
          top: 50%;
          width: 7px;
          height: 7px;
          border-right: 1.5px solid rgba(226, 232, 240, 0.86);
          border-bottom: 1.5px solid rgba(226, 232, 240, 0.86);
          transform: translateY(-62%) rotate(45deg);
          pointer-events: none;
          transition: transform 180ms ease;
        }

        .weather-select-wrap:focus-within .weather-select-chevron {
          transform: translateY(-42%) rotate(225deg);
        }

        .sun-scene {
          background: linear-gradient(120deg, rgba(255, 205, 88, 0.08), rgba(255, 143, 63, 0.14));
        }

        .sun-orb {
          position: absolute;
          right: 26px;
          top: 9px;
          width: 22px;
          height: 22px;
          border-radius: 9999px;
          background: radial-gradient(circle at 35% 35%, #fff8cc 0%, #ffd15a 45%, #ff9f2f 100%);
          box-shadow: 0 0 18px rgba(255, 184, 59, 0.7);
          animation: sunFloat 4s ease-in-out infinite;
        }

        .sun-glow {
          position: absolute;
          right: 17px;
          top: -1px;
          width: 40px;
          height: 40px;
          border-radius: 9999px;
          background: radial-gradient(circle, rgba(255, 201, 82, 0.35) 0%, rgba(255, 201, 82, 0) 70%);
          animation: glowPulse 2.4s ease-in-out infinite;
        }

        .sun-ray {
          position: absolute;
          right: 37px;
          top: 20px;
          width: 2px;
          height: 12px;
          border-radius: 9999px;
          background: linear-gradient(to bottom, rgba(255, 241, 170, 0.95), rgba(255, 183, 74, 0.2));
          transform-origin: center -2px;
          animation: raySpin 6s linear infinite;
        }

        .sun-ray-1 { transform: rotate(0deg) translateY(-16px); }
        .sun-ray-2 { transform: rotate(90deg) translateY(-16px); }
        .sun-ray-3 { transform: rotate(45deg) translateY(-16px); }
        .sun-ray-4 { transform: rotate(135deg) translateY(-16px); }

        .moon-scene {
          background: linear-gradient(120deg, rgba(148, 163, 184, 0.05), rgba(59, 130, 246, 0.1));
        }

        .cloudy-scene {
          background: linear-gradient(120deg, rgba(148, 163, 184, 0.16), rgba(100, 116, 139, 0.16));
        }

        .rainy-scene {
          background: linear-gradient(120deg, rgba(30, 64, 175, 0.14), rgba(51, 65, 85, 0.18));
        }

        .storm-scene {
          background: linear-gradient(120deg, rgba(10, 17, 40, 0.5), rgba(30, 41, 59, 0.45));
        }

        .cloud {
          position: absolute;
          border-radius: 9999px;
          background: rgba(226, 232, 240, 0.85);
          filter: blur(0.2px);
        }

        .cloud-1 {
          width: 34px;
          height: 12px;
          top: 10px;
          left: 34px;
          animation: cloudMove 7s ease-in-out infinite;
        }

        .cloud-2 {
          width: 28px;
          height: 10px;
          top: 16px;
          left: 54px;
          animation: cloudMove 6s ease-in-out infinite;
        }

        .cloud-3 {
          width: 24px;
          height: 9px;
          top: 11px;
          left: 74px;
          animation: cloudMove 8s ease-in-out infinite;
          animation-delay: 0.7s;
        }

        .rain {
          position: absolute;
          width: 1.5px;
          height: 10px;
          border-radius: 9999px;
          background: linear-gradient(to bottom, rgba(191, 219, 254, 0), rgba(191, 219, 254, 0.95));
          animation: rainDrop 1.2s linear infinite;
        }

        .rain-1 { left: 65px; top: 18px; }
        .rain-2 { left: 78px; top: 18px; animation-delay: 0.2s; }
        .rain-3 { left: 90px; top: 18px; animation-delay: 0.4s; }
        .rain-4 { left: 102px; top: 18px; animation-delay: 0.6s; }

        .lightning {
          position: absolute;
          left: 86px;
          top: 16px;
          width: 6px;
          height: 12px;
          clip-path: polygon(50% 0, 90% 0, 58% 45%, 85% 45%, 32% 100%, 45% 55%, 20% 55%);
          background: #fde047;
          filter: drop-shadow(0 0 4px rgba(250, 204, 21, 0.9));
          animation: lightningFlash 2s ease-in-out infinite;
          opacity: 0;
        }

        .moon-orb {
          position: absolute;
          right: 24px;
          top: 8px;
          width: 24px;
          height: 24px;
          border-radius: 9999px;
          background: radial-gradient(circle at 35% 35%, #f8fafc 0%, #dbe8ff 55%, #9fb4d7 100%);
          box-shadow: 0 0 18px rgba(147, 197, 253, 0.35);
          animation: moonFloat 5s ease-in-out infinite;
        }

        .moon-crater {
          position: absolute;
          border-radius: 9999px;
          background: rgba(114, 136, 170, 0.35);
        }

        .moon-crater-1 {
          right: 33px;
          top: 14px;
          width: 5px;
          height: 5px;
        }

        .moon-crater-2 {
          right: 28px;
          top: 21px;
          width: 4px;
          height: 4px;
        }

        .moon-crater-3 {
          right: 41px;
          top: 20px;
          width: 3px;
          height: 3px;
        }

        .shooting-star {
          position: absolute;
          width: 34px;
          height: 1px;
          background: linear-gradient(90deg, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0));
          border-radius: 9999px;
          transform: rotate(-25deg);
          opacity: 0;
        }

        .shooting-star-1 {
          top: 10px;
          left: 10px;
          animation: shooting 3s linear infinite;
        }

        .shooting-star-2 {
          top: 23px;
          left: 20px;
          animation: shooting 3.6s linear infinite;
          animation-delay: 1.4s;
        }

        @keyframes sunFloat {
          0%,
          100% { transform: translateY(0px); }
          50% { transform: translateY(-2px); }
        }

        @keyframes moonFloat {
          0%,
          100% { transform: translateY(0px); }
          50% { transform: translateY(-1px); }
        }

        @keyframes cloudMove {
          0%,
          100% { transform: translateX(0px); }
          50% { transform: translateX(3px); }
        }

        @keyframes rainDrop {
          0% { transform: translateY(0px); opacity: 0; }
          25% { opacity: 1; }
          100% { transform: translateY(7px); opacity: 0; }
        }

        @keyframes lightningFlash {
          0%,
          60%,
          100% { opacity: 0; }
          62%,
          66% { opacity: 1; }
        }

        @keyframes glowPulse {
          0%,
          100% { opacity: 0.45; transform: scale(0.95); }
          50% { opacity: 0.85; transform: scale(1.06); }
        }

        @keyframes raySpin {
          0% { rotate: 0deg; }
          100% { rotate: 360deg; }
        }

        @keyframes shooting {
          0% {
            opacity: 0;
            transform: translateX(0) translateY(0) rotate(-25deg);
          }
          12% {
            opacity: 1;
          }
          45% {
            opacity: 0;
            transform: translateX(44px) translateY(14px) rotate(-25deg);
          }
          100% {
            opacity: 0;
            transform: translateX(44px) translateY(14px) rotate(-25deg);
          }
        }
      `}</style>
    </nav>
  );
}

