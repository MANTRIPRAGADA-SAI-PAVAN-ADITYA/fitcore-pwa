import { TruckType, LoadType, PriceEstimate, PricingConfig, LoadTypeFactor } from '../types';
import { BASE_RATES, LOAD_FACTORS } from '../constants/pricing';
import { supabase } from './supabase';

// Haversine formula — returns distance in km
export function haversineKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}

// Estimate price using DB config (falls back to constants)
export async function estimatePrice(
  truckType: TruckType,
  loadType: LoadType,
  distanceKm: number
): Promise<PriceEstimate> {
  // Fetch from DB
  const [{ data: pricingRows }, { data: factorRows }] = await Promise.all([
    supabase.from('pricing_config').select('*').eq('truck_type', truckType).single(),
    supabase.from('load_type_factors').select('*').eq('load_type', loadType).single(),
  ]);

  const config = pricingRows as PricingConfig | null;
  const factorRow = factorRows as LoadTypeFactor | null;

  const baseRate = config?.base_rate_per_km ?? BASE_RATES[truckType];
  const fuelSurcharge = config?.fuel_surcharge ?? 1.15;
  const demandMultiplier = config?.demand_multiplier ?? 1.0;
  const loadFactor = factorRow?.factor ?? LOAD_FACTORS[loadType];

  const estimatedPrice =
    distanceKm * baseRate * loadFactor * fuelSurcharge * demandMultiplier;

  const demandLevel: PriceEstimate['demand_level'] =
    demandMultiplier < 0.95 ? 'low' : demandMultiplier > 1.05 ? 'high' : 'normal';

  return {
    distance_km: Math.round(distanceKm),
    base_rate: baseRate,
    load_factor: loadFactor,
    fuel_surcharge: fuelSurcharge,
    demand_multiplier: demandMultiplier,
    estimated_price: Math.round(estimatedPrice),
    demand_level: demandLevel,
  };
}

// Synchronous estimate using local constants (for instant feedback)
export function estimatePriceSync(
  truckType: TruckType,
  loadType: LoadType,
  distanceKm: number,
  demandMultiplier = 1.0
): PriceEstimate {
  const baseRate = BASE_RATES[truckType];
  const loadFactor = LOAD_FACTORS[loadType];
  const fuelSurcharge = 1.15;

  const estimatedPrice =
    distanceKm * baseRate * loadFactor * fuelSurcharge * demandMultiplier;

  const demandLevel: PriceEstimate['demand_level'] =
    demandMultiplier < 0.95 ? 'low' : demandMultiplier > 1.05 ? 'high' : 'normal';

  return {
    distance_km: Math.round(distanceKm),
    base_rate: baseRate,
    load_factor: loadFactor,
    fuel_surcharge: fuelSurcharge,
    demand_multiplier: demandMultiplier,
    estimated_price: Math.round(estimatedPrice),
    demand_level: demandLevel,
  };
}

export function formatPrice(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

export function formatDistance(km: number): string {
  return km >= 1000 ? `${(km / 1000).toFixed(1)}K km` : `${km} km`;
}
