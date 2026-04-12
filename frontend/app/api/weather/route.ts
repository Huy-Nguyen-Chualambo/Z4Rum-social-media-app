import { NextRequest, NextResponse } from "next/server";

const LOCATION_MAP = {
  hanoi: "Ha Noi",
  hcmc: "Ho Chi Minh City"
} as const;

type LocationKey = keyof typeof LOCATION_MAP;

type WeatherstackCurrent = {
  temperature?: number;
  weather_code?: number;
  weather_descriptions?: string[];
  is_day?: "yes" | "no";
};

type WeatherstackResponse = {
  success?: boolean;
  error?: { info?: string };
  location?: { name?: string; country?: string };
  current?: WeatherstackCurrent;
};

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const apiKey = process.env.WEATHERSTACK_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ message: "Missing WEATHERSTACK_API_KEY" }, { status: 500 });
  }

  const cityParam = (req.nextUrl.searchParams.get("city") || "hanoi").toLowerCase();
  const city = (cityParam in LOCATION_MAP ? cityParam : "hanoi") as LocationKey;
  const query = LOCATION_MAP[city];

  const endpoint = `http://api.weatherstack.com/current?access_key=${encodeURIComponent(apiKey)}&query=${encodeURIComponent(query)}`;

  try {
    const response = await fetch(endpoint, { cache: "no-store" });
    const data = (await response.json()) as WeatherstackResponse;

    if (!response.ok || data.success === false || !data.current) {
      return NextResponse.json(
        { message: data.error?.info || "Unable to fetch weather data" },
        { status: 502 }
      );
    }

    return NextResponse.json({
      city,
      locationName: data.location?.name || query,
      country: data.location?.country || "Vietnam",
      temperature: data.current.temperature ?? null,
      description: data.current.weather_descriptions?.[0] || "Unknown",
      weatherCode: data.current.weather_code ?? null,
      isDay: data.current.is_day || "yes"
    });
  } catch {
    return NextResponse.json({ message: "Weather service unavailable" }, { status: 502 });
  }
}
