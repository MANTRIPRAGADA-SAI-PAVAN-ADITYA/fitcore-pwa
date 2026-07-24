import { TruckType, LoadType } from '../types';

export const TRUCK_LABELS: Record<TruckType, string> = {
  mini: 'Mini Truck (< 1T)',
  lcv: 'LCV (1–3.5T)',
  hcv: 'HCV (3.5–12T)',
  trailer: 'Trailer (12–40T)',
  container: 'Container (20/40 ft)',
};

export const TRUCK_ICONS: Record<TruckType, string> = {
  mini: '🚐',
  lcv: '🚚',
  hcv: '🚛',
  trailer: '🚜',
  container: '📦',
};

export const TRUCK_CAPACITY: Record<TruckType, string> = {
  mini: 'Up to 1 ton',
  lcv: '1 – 3.5 tons',
  hcv: '3.5 – 12 tons',
  trailer: '12 – 40 tons',
  container: '20 / 40 ft',
};

// Fallback rates (overridden by DB values)
export const BASE_RATES: Record<TruckType, number> = {
  mini: 12,
  lcv: 15,
  hcv: 20,
  trailer: 25,
  container: 28,
};

export const LOAD_TYPE_LABELS: Record<LoadType, string> = {
  general: 'General Goods',
  fragile: 'Fragile Items',
  perishable: 'Perishable / Cold Chain',
  hazardous: 'Hazardous Materials',
  oversized: 'Oversized / OD Cargo',
};

export const LOAD_TYPE_ICONS: Record<LoadType, string> = {
  general: '📦',
  fragile: '🪟',
  perishable: '❄️',
  hazardous: '⚠️',
  oversized: '🏗️',
};

// Fallback factors (overridden by DB values)
export const LOAD_FACTORS: Record<LoadType, number> = {
  general: 1.0,
  fragile: 1.2,
  perishable: 1.3,
  hazardous: 1.5,
  oversized: 1.4,
};

export const CREDITS_PER_UNLOCK = 1;
export const DEFAULT_CREDITS = 5;
export const MATCH_RADIUS_KM = 150;
