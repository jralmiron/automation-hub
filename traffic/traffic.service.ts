const COMMUTE = {
  from: { name: "Rincón de la Victoria", lat: 36.7176, lon: -4.2754 },
  to: { name: "Vélez-Málaga", lat: 36.7811, lon: -4.1027 },
};

export async function getTrafficBrief() {
  const url = `https://router.project-osrm.org/route/v1/driving/${COMMUTE.from.lon},${COMMUTE.from.lat};${COMMUTE.to.lon},${COMMUTE.to.lat}?overview=false`;
  const response = await fetch(url);
  const payload = (await response.json()) as {
    routes?: Array<{ duration?: number; distance?: number }>;
    code?: string;
  };

  if (!response.ok || payload.code !== "Ok" || !payload.routes?.[0]) {
    return { ok: false as const, error: "No se pudo calcular el trayecto estimado" };
  }

  const route = payload.routes[0];
  return {
    ok: true as const,
    from: COMMUTE.from.name,
    to: COMMUTE.to.name,
    durationMinutes: Math.round((route.duration ?? 0) / 60),
    distanceKm: Math.round(((route.distance ?? 0) / 1000) * 10) / 10,
    provider: "OSRM",
    liveTraffic: false,
  };
}

export function formatTrafficTelegramMessage(
  traffic: Awaited<ReturnType<typeof getTrafficBrief>> | { ok: false; error: string },
) {
  if (!traffic.ok) {
    return `<b>Tráfico</b>\n${traffic.error}`;
  }

  return [
    "<b>Tráfico</b>",
    `${traffic.from} → ${traffic.to}`,
    `Trayecto estimado: ${traffic.durationMinutes} min (${traffic.distanceKm} km)`,
    "Nota: estimación de ruta, no tráfico en tiempo real.",
  ].join("\n");
}
