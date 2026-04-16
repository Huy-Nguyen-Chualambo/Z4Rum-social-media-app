import { NextRequest, NextResponse } from "next/server";

const LOCATION_MAP = {
  hanoi: "Ha Noi",
  hcmc: "Ho Chi Minh City"
} as const;

type LocationKey = keyof typeof LOCATION_MAP;

type WeatherApiCurrent = {
  temp_c?: number;
  condition?: {
    text?: string;
    code?: number;
  };
  is_day?: "yes" | "no";
};

type WeatherApiResponse = {
  error?: { message?: string };
  location?: { name?: string; country?: string };
  current?: WeatherApiCurrent;
};

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const apiKey = process.env.WEATHERAPI_KEY || process.env.WEATHERSTACK_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { message: "Missing WEATHERAPI_KEY (or WEATHERSTACK_API_KEY)" },
      { status: 500 }
    );
  }

  const cityParam = (req.nextUrl.searchParams.get("city") || "hanoi").toLowerCase();
  const city = (cityParam in LOCATION_MAP ? cityParam : "hanoi") as LocationKey;
  const query = LOCATION_MAP[city];

  const endpoint = `https://api.weatherapi.com/v1/current.json?key=${encodeURIComponent(apiKey)}&q=${encodeURIComponent(query)}`;

  try {
    const response = await fetch(endpoint, { cache: "no-store" });
    const data = (await response.json()) as WeatherApiResponse;

    if (!response.ok || data.error || !data.current) {
      return NextResponse.json(
        { message: data.error?.message || "Unable to fetch weather data" },
        { status: 502 }
      );
    }

    return NextResponse.json({
      city,
      locationName: data.location?.name || query,
      country: data.location?.country || "Vietnam",
      temperature: data.current.temp_c ?? null,
      description: data.current.condition?.text || "Unknown",
      weatherCode: data.current.condition?.code ?? null,
      isDay: data.current.is_day || "yes"
    });
  } catch {
    return NextResponse.json({ message: "Weather service unavailable" }, { status: 502 });
  }
}
