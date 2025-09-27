// Sensor data API layer
// Provide typed-like helpers to fetch sensor history/search

import { ENDPOINTS } from '../config.js';

export async function fetchSensorsPage({ page = 0, size = 15, sort = 'desc', metric = 'ALL', date = '', valueOp = '', value = '', valueTo = '', tolerance = '' } = {}) {
  const params = new URLSearchParams({ page, size, sort });
  if (metric) params.append('metric', metric);
  if (date) params.append('date', date);
  if (valueOp) params.append('valueOp', valueOp);
  if (value !== '' && value !== null && value !== undefined) params.append('value', value);
  if (valueTo !== '' && valueTo !== null && valueTo !== undefined) params.append('valueTo', valueTo);
  if (tolerance !== '' && tolerance !== null && tolerance !== undefined) params.append('tolerance', tolerance);
  params.append('_', Date.now());
  const hasValueFilter = !!valueOp;
  const endpoint = (date || hasValueFilter) ? `${ENDPOINTS.sensors}/search` : ENDPOINTS.sensors;
  const res = await fetch(`${endpoint}?${params.toString()}`);
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    if (json && json.code === 'INVALID_DATE_FORMAT') {
      return json;
    }
    throw new Error(`HTTP ${res.status}`);
  }
  return json;
}


