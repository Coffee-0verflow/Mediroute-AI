export interface VehicleHealth {
  fuel_percent: number;
  battery_percent: number;
  oxygen_percent: number;
  tyres: {
    front_left: number;
    front_right: number;
    rear_left: number;
    rear_right: number;
  };
}

export interface Ambulance {
  id: string;
  vehicle_number: string;
  current_lat: number;
  current_lng: number;
  speed: number;
  heading: number;
  vehicle_health: VehicleHealth;
}

export interface EmergencyType {
  id: string;
  label: string;
  keyword: string;
  icon: string;
}

export interface LocationSuggestion {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export interface PickupLocation {
  lat: number;
  lng: number;
  address?: string;
}