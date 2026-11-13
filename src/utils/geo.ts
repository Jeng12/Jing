const EARTH_RADIUS_M = 6371000;
const rad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance in meters. */
export function distanceMeters(a: [number, number], b: [number, number]): number {
  const dLat = rad(b[0] - a[0]);
  const dLon = rad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

/** Keeps every n-th point (plus the last) so a route has at most `max` points. */
export function thin<T>(points: T[], max: number): T[] {
  if (points.length <= max) return points;
  const step = points.length / max;
  const out: T[] = [];
  for (let i = 0; i < max - 1; i++) out.push(points[Math.floor(i * step)]);
  out.push(points[points.length - 1]);
  return out;
}

/** Projects lat/lon pairs into an SVG box of the given size, keeping the route's proportions. */
export function routeToPoints(route: [number, number][], width: number, height: number, pad = 12): string {
  if (route.length < 2) return '';
  const lats = route.map(p => p[0]);
  const lons = route.map(p => p[1]);
  const midLat = rad((Math.min(...lats) + Math.max(...lats)) / 2);
  // Longitude degrees shrink towards the poles.
  const xs = lons.map(l => l * Math.cos(midLat));
  const minX = Math.min(...xs);
  const minY = Math.min(...lats);
  const spanX = Math.max(...xs) - minX || 1e-9;
  const spanY = Math.max(...lats) - minY || 1e-9;
  const scale = Math.min((width - pad * 2) / spanX, (height - pad * 2) / spanY);
  const offX = (width - spanX * scale) / 2;
  const offY = (height - spanY * scale) / 2;
  return route
    .map((_, i) => `${(offX + (xs[i] - minX) * scale).toFixed(1)},${(height - offY - (lats[i] - minY) * scale).toFixed(1)}`)
    .join(' ');
}
