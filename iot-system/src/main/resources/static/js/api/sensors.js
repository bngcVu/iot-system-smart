// Sensor data API layer
// Provide typed-like helpers to fetch sensor history/search

import { ENDPOINTS } from '../config.js';

export async function fetchSensorsPage({ page = 0, size = 15, sort = 'desc', metric = 'ALL', date = '' } = {}) {
  const params = new URLSearchParams({ page, size, sort });
  if (metric) params.append('metric', metric);
  if (date) params.append('date', date);
  params.append('_', Date.now());
  const endpoint = date ? `${ENDPOINTS.sensors}/search` : ENDPOINTS.sensors;
  const res = await fetch(`${endpoint}?${params.toString()}`);
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    if (json && json.code === 'INVALID_DATE_FORMAT') {
      return json; // FE will handle
    }
    throw new Error(`HTTP ${res.status}`);
  }
  return json;
}


