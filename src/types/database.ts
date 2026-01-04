// Custom types for the ambulance system

export type UserRole = 'ambulance' | 'hospital' | 'admin';
export type EmergencyStatus = 'inactive' | 'active' | 'responding';
export type RouteDirection = 'N_S' | 'S_N' | 'E_W' | 'W_E';
export type SignalStatus = 'normal' | 'prepare' | 'priority';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  organization_name: string | null;
  is_approved: boolean;
  ambulance_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Ambulance {
  vehicle_health: any;
  id: string;
  driver_id: string;
  vehicle_number: string;
  current_lat: number;
  current_lng: number;
  heading: number;
  speed: number;
  emergency_status: EmergencyStatus;
  route_direction: RouteDirection | null;
  destination_lat: number | null;
  destination_lng: number | null;
  destination_name: string | null;
  last_updated: string;
  created_at: string;
}

export interface TrafficSignal {
  id: string;
  signal_name: string;
  location_lat: number;
  location_lng: number;
  current_status: SignalStatus;
  direction_ns: string;
  direction_sn: string;
  direction_ew: string;
  direction_we: string;
  priority_direction: RouteDirection | null;
  activated_by: string | null;
  last_updated: string;
  created_at: string;
}

export interface SignalActivation {
  id: string;
  signal_id: string;
  ambulance_id: string;
  activation_type: string;
  distance_meters: number;
  activated_at: string;
}

// Helper to calculate distance using Haversine formula
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

// Calculate ETA based on distance and speed
export function calculateETA(distanceMeters: number, speedKmh: number): number {
  if (speedKmh <= 0) return 0;
  const speedMs = speedKmh * (1000 / 3600); // Convert km/h to m/s
  return distanceMeters / speedMs; // Time in seconds
}

export function formatETA(seconds: number): string {
  if (seconds <= 0) return 'Calculating...';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  if (mins < 1) return `${secs} sec`;
  return `${mins} min ${secs} sec`;
}

// Determine route direction based on heading
export function getRouteDirection(heading: number): RouteDirection {
  // Normalize heading to 0-360
  heading = ((heading % 360) + 360) % 360;
  
  if (heading >= 315 || heading < 45) return 'N_S'; // Moving North to South
  if (heading >= 45 && heading < 135) return 'E_W'; // Moving East to West
  if (heading >= 135 && heading < 225) return 'S_N'; // Moving South to North
  return 'W_E'; // Moving West to East
}
