// ============================================================
// LooP — Global TypeScript Types
// ============================================================

export type UserRole = 'driver' | 'shipper' | 'both' | 'admin';
export type KycStatus = 'none' | 'pending' | 'approved' | 'rejected';
export type TruckType = 'mini' | 'lcv' | 'hcv' | 'trailer' | 'container';
export type LoadType = 'general' | 'fragile' | 'perishable' | 'hazardous' | 'oversized';
export type ListingStatus = 'active' | 'matched' | 'completed' | 'cancelled';
export type TripStatus = 'pending' | 'confirmed' | 'in_transit' | 'delivered' | 'cancelled';
export type DocType = 'license' | 'rc' | 'gst' | 'aadhar' | 'pan';
export type KycDocStatus = 'pending' | 'approved' | 'rejected';
export type ListingMode = 'ad' | 'managed';
export type BidStatus = 'pending' | 'accepted' | 'rejected' | 'countered';

export interface Profile {
  id: string;
  phone: string | null;
  name: string | null;
  role: UserRole;
  company: string | null;
  kyc_status: KycStatus;
  credits: number;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface KycDocument {
  id: string;
  user_id: string;
  doc_type: DocType;
  file_url: string;
  file_name: string | null;
  status: KycDocStatus;
  admin_note: string | null;
  uploaded_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
}

export interface Truck {
  id: string;
  driver_id: string;
  origin: string;
  origin_lat: number | null;
  origin_lng: number | null;
  destination: string;
  dest_lat: number | null;
  dest_lng: number | null;
  truck_type: TruckType;
  capacity_tons: number;
  available_date: string;
  price_per_km: number | null;
  notes: string | null;
  status: ListingStatus;
  listing_mode: ListingMode;
  created_at: string;
  // joined
  driver?: Pick<Profile, 'id' | 'name' | 'phone' | 'company' | 'kyc_status'>;
}

export interface Load {
  id: string;
  shipper_id: string;
  origin: string;
  origin_lat: number | null;
  origin_lng: number | null;
  destination: string;
  dest_lat: number | null;
  dest_lng: number | null;
  weight_tons: number;
  load_type: LoadType;
  pickup_date: string;
  budget_min: number | null;
  budget_max: number | null;
  notes: string | null;
  status: ListingStatus;
  listing_mode: ListingMode;
  created_at: string;
  // joined
  shipper?: Pick<Profile, 'id' | 'name' | 'phone' | 'company' | 'kyc_status'>;
}

export interface Bid {
  id: string;
  listing_id: string;
  listing_type: 'truck' | 'load';
  bidder_id: string;
  amount: number;
  message: string | null;
  status: BidStatus;
  counter_amount: number | null;
  created_at: string;
  updated_at: string;
  // joined
  bidder?: Pick<Profile, 'id' | 'name' | 'phone' | 'company' | 'kyc_status'>;
}

export interface Rating {
  id: string;
  trip_id: string;
  rater_id: string;
  rated_id: string;
  score: number;
  comment: string | null;
  role: 'driver' | 'shipper';
  created_at: string;
}

export interface Conversation {
  id: string;
  listing_id: string | null;
  listing_type: 'truck' | 'load' | null;
  trip_id: string | null;
  participant1_id: string;
  participant2_id: string;
  last_message: string | null;
  last_message_at: string | null;
  created_at: string;
  participant1?: Pick<Profile, 'id' | 'name' | 'phone'>;
  participant2?: Pick<Profile, 'id' | 'name' | 'phone'>;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  text: string;
  is_read: boolean;
  created_at: string;
}

export interface TripLocation {
  id: string;
  trip_id: string;
  driver_id: string;
  lat: number;
  lng: number;
  recorded_at: string;
}

export interface PricingOverride {
  id: string;
  key: string;
  value: number;
  label: string;
  updated_at: string;
}

export interface Unlock {
  id: string;
  unlocker_id: string;
  listing_type: 'truck' | 'load';
  listing_id: string;
  credits_spent: number;
  unlocked_at: string;
}

export interface Trip {
  id: string;
  truck_id: string | null;
  load_id: string | null;
  driver_id: string;
  shipper_id: string;
  status: TripStatus;
  agreed_price: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // joined
  truck?: Truck;
  load?: Load;
  driver?: Pick<Profile, 'id' | 'name' | 'phone'>;
  shipper?: Pick<Profile, 'id' | 'name' | 'phone'>;
}

export interface PricingConfig {
  id: string;
  truck_type: TruckType;
  base_rate_per_km: number;
  fuel_surcharge: number;
  demand_multiplier: number;
  updated_at: string;
}

export interface LoadTypeFactor {
  id: string;
  load_type: LoadType;
  factor: number;
  label: string;
}

export interface PriceEstimate {
  distance_km: number;
  base_rate: number;
  load_factor: number;
  fuel_surcharge: number;
  demand_multiplier: number;
  estimated_price: number;
  demand_level: 'low' | 'normal' | 'high';
}

export type NotificationType =
  | 'bid_placed' | 'bid_accepted' | 'bid_rejected'
  | 'new_message' | 'trip_update' | 'kyc_decision' | 'system';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, any>;
  is_read: boolean;
  created_at: string;
}

export interface CreditTransaction {
  id: string;
  user_id: string;
  type: 'purchase' | 'spend' | 'refund' | 'bonus';
  amount: number;
  description: string;
  reference_id: string | null;
  created_at: string;
}

export interface MatchResult {
  listing_id: string;
  name: string;
  origin: string;
  destination: string;
  distance_km?: number;
  origin_dist: number;
  dest_dist: number;
  // truck-specific
  truck_type?: TruckType;
  capacity_tons?: number;
  available_date?: string;
  price_per_km?: number;
  // load-specific
  weight_tons?: number;
  load_type?: LoadType;
  pickup_date?: string;
  budget_max?: number;
}
