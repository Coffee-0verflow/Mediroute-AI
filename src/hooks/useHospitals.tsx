import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Hospital {
  id: string;
  organization_name: string;
  email: string;
  full_name: string | null;
  location_lat: number;
  location_lng: number;
}

// Default hospital locations with all details (using generated UUIDs)
const DEFAULT_HOSPITALS: Hospital[] = [
  // Chandigarh Hospitals
  { id: '00000000-0000-0000-0000-000000000001', organization_name: 'PGIMER Chandigarh', email: '', full_name: null, location_lat: 30.7649, location_lng: 76.7757 },
  { id: '00000000-0000-0000-0000-000000000002', organization_name: 'GMCH Sector 32', email: '', full_name: null, location_lat: 30.7422, location_lng: 76.7676 },
  { id: '00000000-0000-0000-0000-000000000003', organization_name: 'Fortis Hospital Mohali', email: '', full_name: null, location_lat: 30.7133, location_lng: 76.6912 },
  { id: '00000000-0000-0000-0000-000000000004', organization_name: 'Max Super Speciality', email: '', full_name: null, location_lat: 30.7046, location_lng: 76.7179 },
  { id: '00000000-0000-0000-0000-000000000005', organization_name: 'Ivy Hospital', email: '', full_name: null, location_lat: 30.7081, location_lng: 76.7104 },
  { id: '00000000-0000-0000-0000-000000000006', organization_name: 'Alchemist Hospital', email: '', full_name: null, location_lat: 30.7254, location_lng: 76.7408 },
  
  // Delhi Hospitals
  { id: '00000000-0000-0000-0000-000000000020', organization_name: 'AIIMS Delhi', email: '', full_name: null, location_lat: 28.5672, location_lng: 77.2100 },
  { id: '00000000-0000-0000-0000-000000000021', organization_name: 'Safdarjung Hospital', email: '', full_name: null, location_lat: 28.5738, location_lng: 77.2088 },
  { id: '00000000-0000-0000-0000-000000000022', organization_name: 'Ram Manohar Lohia Hospital', email: '', full_name: null, location_lat: 28.6358, location_lng: 77.2244 },
  { id: '00000000-0000-0000-0000-000000000023', organization_name: 'Sir Ganga Ram Hospital', email: '', full_name: null, location_lat: 28.6454, location_lng: 77.1907 },
  { id: '00000000-0000-0000-0000-000000000024', organization_name: 'Max Saket Delhi', email: '', full_name: null, location_lat: 28.5245, location_lng: 77.2066 },
  { id: '00000000-0000-0000-0000-000000000025', organization_name: 'Fortis Shalimar Bagh', email: '', full_name: null, location_lat: 28.7196, location_lng: 77.1647 },
  { id: '00000000-0000-0000-0000-000000000026', organization_name: 'Apollo Delhi', email: '', full_name: null, location_lat: 28.5672, location_lng: 77.2773 },
  { id: '00000000-0000-0000-0000-000000000027', organization_name: 'BLK Super Speciality', email: '', full_name: null, location_lat: 28.6507, location_lng: 77.2334 },
  
  // Jaipur Hospitals
  { id: '00000000-0000-0000-0000-000000000030', organization_name: 'SMS Hospital Jaipur', email: '', full_name: null, location_lat: 26.9124, location_lng: 75.7873 },
  { id: '00000000-0000-0000-0000-000000000031', organization_name: 'Fortis Escorts Jaipur', email: '', full_name: null, location_lat: 26.8467, location_lng: 75.8056 },
  { id: '00000000-0000-0000-0000-000000000032', organization_name: 'Narayana Hospital Jaipur', email: '', full_name: null, location_lat: 26.8467, location_lng: 75.8156 },
  { id: '00000000-0000-0000-0000-000000000033', organization_name: 'Manipal Hospital Jaipur', email: '', full_name: null, location_lat: 26.9800, location_lng: 75.7600 },
  { id: '00000000-0000-0000-0000-000000000034', organization_name: 'Max Hospital Jaipur', email: '', full_name: null, location_lat: 26.9000, location_lng: 75.8000 },
  { id: '00000000-0000-0000-0000-000000000035', organization_name: 'CK Birla Hospital', email: '', full_name: null, location_lat: 26.9200, location_lng: 75.8200 },
  { id: '00000000-0000-0000-0000-000000000036', organization_name: 'Eternal Hospital Jaipur', email: '', full_name: null, location_lat: 26.8200, location_lng: 75.8500 },
];

// Hospital location lookup for DB hospitals
const HOSPITAL_LOCATIONS: Record<string, { lat: number; lng: number }> = {
  'PGIMER Chandigarh': { lat: 30.7649, lng: 76.7757 },
  'GMCH Sector 32': { lat: 30.7422, lng: 76.7676 },
  'Fortis Hospital Mohali': { lat: 30.7133, lng: 76.6912 },
  'Max Super Speciality': { lat: 30.7046, lng: 76.7179 },
  'Ivy Hospital': { lat: 30.7081, lng: 76.7104 },
  'Alchemist Hospital': { lat: 30.7254, lng: 76.7408 },
  'Indus Hospital': { lat: 30.7055, lng: 76.7245 },
  'Healing Hospital': { lat: 30.7185, lng: 76.7325 },
  'SPS Apollo Hospital': { lat: 30.6912, lng: 76.7489 },
  'Silver Oaks Hospital': { lat: 30.7389, lng: 76.7812 },
  'Mukat Hospital': { lat: 30.7512, lng: 76.7645 },
  'Grecian Hospital': { lat: 30.7095, lng: 76.6878 },
};

export function useHospitals() {
  const [hospitals, setHospitals] = useState<Hospital[]>(DEFAULT_HOSPITALS);
  const [loading, setLoading] = useState(true);

  const fetchHospitals = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, organization_name, email, full_name')
        .eq('role', 'hospital');

      if (error) throw error;

      // Combine DB hospitals with default hospitals
      const dbHospitals = (data || [])
        .filter(h => h.organization_name) // Only include hospitals with names
        .map(hospital => {
          const location = HOSPITAL_LOCATIONS[hospital.organization_name || ''] || 
                          { lat: 30.7333 + Math.random() * 0.03, lng: 76.7794 + Math.random() * 0.03 };
          return {
            ...hospital,
            organization_name: hospital.organization_name!,
            location_lat: location.lat,
            location_lng: location.lng
          };
        });

      // Merge: DB hospitals first, then default hospitals not in DB
      const dbHospitalNames = new Set(dbHospitals.map(h => h.organization_name));
      const uniqueDefaultHospitals = DEFAULT_HOSPITALS.filter(h => !dbHospitalNames.has(h.organization_name));
      
      setHospitals([...dbHospitals, ...uniqueDefaultHospitals]);
    } catch (error) {
      console.error('Error fetching hospitals:', error);
      // On error, use default hospitals
      setHospitals(DEFAULT_HOSPITALS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHospitals();
  }, [fetchHospitals]);

  // Calculate distance between two points
  const calculateDistanceToHospital = (
    fromLat: number,
    fromLng: number,
    hospital: Hospital
  ): number => {
    const R = 6371000; // Earth's radius in meters
    const dLat = (hospital.location_lat - fromLat) * (Math.PI / 180);
    const dLng = (hospital.location_lng - fromLng) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(fromLat * (Math.PI / 180)) *
        Math.cos(hospital.location_lat * (Math.PI / 180)) *
        Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Get hospitals sorted by distance
  const getHospitalsByDistance = (fromLat: number, fromLng: number) => {
    return [...hospitals]
      .map(h => ({
        ...h,
        distance: calculateDistanceToHospital(fromLat, fromLng, h)
      }))
      .sort((a, b) => a.distance - b.distance);
  };

  return {
    hospitals,
    loading,
    fetchHospitals,
    getHospitalsByDistance
  };
}
