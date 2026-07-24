# LooP — Architecture Document

## Overview

LooP is a logistics matching platform connecting **Drivers** (truck space) with **Shippers** (loads).
Users pay credits to unlock each other's contact info, then negotiate offline.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Mobile Framework | React Native (Expo SDK 51) |
| Navigation | Expo Router v3 (file-based) |
| UI Library | React Native Paper v5 |
| Maps | react-native-maps |
| Bottom Sheet | @gorhom/bottom-sheet v4 |
| Backend / Auth | Supabase (PostgreSQL + Auth + Storage) |
| State Management | Zustand |
| Form Handling | react-hook-form |
| Image/Doc Picker | expo-image-picker, expo-document-picker |

---

## User Roles

| Role | Can Do |
|---|---|
| Driver | Post truck space, browse loads, unlock shipper contacts |
| Shipper | Post loads, browse trucks, unlock driver contacts |
| Admin | Review KYC documents, approve/reject |

---

## Core Flows

### Auth Flow
```
Splash → Phone Input → OTP Verify → Profile Setup → Home
```

### Driver Flow
```
Home (Map) → Post Truck → Browse Loads → Unlock Contact → Call Shipper
```

### Shipper Flow
```
Home (Map) → Post Load → Browse Trucks → Unlock Contact → Call Driver
```

### KYC Flow
```
Profile → Upload Docs → Admin Reviews → Status Updated
```

### Lead Unlock Flow
```
View Listing → [Pay 1 Credit] → Reveal Phone Number
```

---

## Matching Logic

A truck matches a load when:
1. **Origin proximity**: load pickup is within ~100km of truck origin, OR along the route
2. **Destination proximity**: load destination is within ~100km of truck destination
3. **Date compatibility**: truck available_date >= load pickup_date
4. **Capacity**: truck capacity_tons >= load weight_tons

Matching is done via a **Supabase RPC function** (PostGIS or simple lat/lng distance formula).

---

## Price Estimation Formula

```
estimated_price = distance_km × base_rate_per_km × load_factor × fuel_surcharge × demand_multiplier
```

| Variable | Source |
|---|---|
| distance_km | Haversine formula from coordinates |
| base_rate_per_km | pricing_config table (per truck_type) |
| load_factor | pricing_config table (per load_type) |
| fuel_surcharge | pricing_config table |
| demand_multiplier | pricing_config table (updated by admin) |

---

## Credit System (Mock)

- New users get **5 free credits**
- Each lead unlock costs **1 credit** (hardcoded for MVP)
- No real payment — admin can top up credits manually
- Unlock record stored in `unlocks` table to prevent double-charging

---

## Supabase Storage Buckets

| Bucket | Contents | Access |
|---|---|---|
| kyc-documents | License, RC, GST, Aadhaar, PAN | Private (authenticated) |

---

## RLS Policy Summary

- `profiles`: users can read all, update only own
- `trucks`: authenticated can read active; driver can CRUD own
- `loads`: authenticated can read active; shipper can CRUD own
- `kyc_documents`: user can read/write own; admin can read all
- `unlocks`: user can read own; insert when paying credit
- `trips`: participants can read/update own trips
- `pricing_config`: public read; admin write only
