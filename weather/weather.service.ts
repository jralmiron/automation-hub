import { env } from "../src/config/env.js";

type LocationKey = "rincon" | "velez";

const LOCATIONS: Record<
  LocationKey,
  { name: string; lat: number; lon: number; aemetMunicipioId?: string }
> = {
  rincon: {
    name: "Rincón de la Victoria",
    lat: 36.7176,
    lon: -4.2754,
    aemetMunicipioId: "29082",
  },
  velez: {
    name: "Vélez-Málaga",
    lat: 36.7811,
    lon: -4.1027,
  },
};

async function fetchJson<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  const payload = (await response.json()) as T;
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return payload;
}

async function getOpenWeatherForLocation(location: LocationKey) {
  if (!env.OPENWEATHER_API_KEY) {
    return { ok: false as const, error: "Falta OPENWEATHER_API_KEY" };
  }

  const target = LOCATIONS[location];
  const params = new URLSearchParams({
    lat: String(target.lat),
    lon: String(target.lon),
    appid: env.OPENWEATHER_API_KEY,
    units: "metric",
    lang: "es",
  });

  const payload = await fetchJson<{
    weather?: Array<{ description?: string }>;
    main?: { temp?: number; feels_like?: number; humidity?: number };
    wind?: { speed?: number };
  }>(`https://api.openweathermap.org/data/2.5/weather?${params.toString()}`);

  return {
    ok: true as const,
    location: target.name,
    summary: payload.weather?.[0]?.description ?? "sin datos",
    temp: payload.main?.temp ?? null,
    feelsLike: payload.main?.feels_like ?? null,
    humidity: payload.main?.humidity ?? null,
    windSpeed: payload.wind?.speed ?? null,
  };
}

async function getAemetDailyForecast() {
  if (!env.AEMET_API_KEY || !LOCATIONS.rincon.aemetMunicipioId) {
    return { ok: false as const, error: "Falta AEMET_API_KEY o municipio" };
  }

  const first = await fetchJson<{ datos?: string; estado?: number; descripcion?: string }>(
    `https://opendata.aemet.es/opendata/api/prediccion/especifica/municipio/diaria/${LOCATIONS.rincon.aemetMunicipioId}?api_key=${encodeURIComponent(env.AEMET_API_KEY)}`,
  );

  if (!first.datos) {
    return { ok: false as const, error: first.descripcion ?? "AEMET sin enlace de datos" };
  }

  const data = await fetchJson<
    Array<{
      nombre?: string;
      prediccion?: {
        dia?: Array<{
          estadoCielo?: Array<{ descripcion?: string; periodo?: string }>;
          temperatura?: { maxima?: number; minima?: number };
          probPrecipitacion?: Array<{ value?: string; periodo?: string }>;
        }>;
      };
    }>
  >(first.datos);

  const today = data?.[0]?.prediccion?.dia?.[0];
  return {
    ok: true as const,
    location: data?.[0]?.nombre ?? LOCATIONS.rincon.name,
    sky:
      today?.estadoCielo?.find((item) => !item.periodo || item.periodo === "12-24")?.descripcion ??
      today?.estadoCielo?.[0]?.descripcion ??
      "sin datos",
    max: today?.temperatura?.maxima ?? null,
    min: today?.temperatura?.minima ?? null,
    rainProbability:
      today?.probPrecipitacion?.find((item) => !item.periodo || item.periodo === "00-24")?.value ??
      today?.probPrecipitacion?.[0]?.value ??
      null,
  };
}

export async function getWeatherBrief() {
  const [rincon, velez, aemet] = await Promise.all([
    getOpenWeatherForLocation("rincon").catch((error) => ({ ok: false as const, error: String(error) })),
    getOpenWeatherForLocation("velez").catch((error) => ({ ok: false as const, error: String(error) })),
    getAemetDailyForecast().catch((error) => ({ ok: false as const, error: String(error) })),
  ]);

  return { rincon, velez, aemet };
}

export function formatWeatherTelegramMessage(brief: Awaited<ReturnType<typeof getWeatherBrief>>) {
  const lines = ["<b>Tiempo</b>"];

  for (const item of [brief.rincon, brief.velez]) {
    if (!item.ok) {
      lines.push(`- Tiempo no disponible: ${item.error}`);
      continue;
    }

    lines.push(
      `- ${item.location}: ${item.summary}, ${item.temp ?? "?"}ºC, sensación ${item.feelsLike ?? "?"}ºC`,
    );
  }

  if (brief.aemet.ok) {
    lines.push(
      `- AEMET ${brief.aemet.location}: ${brief.aemet.sky}, min ${brief.aemet.min ?? "?"}ºC / max ${brief.aemet.max ?? "?"}ºC, lluvia ${brief.aemet.rainProbability ?? "?"}%`,
    );
  }

  return lines.join("\n");
}
