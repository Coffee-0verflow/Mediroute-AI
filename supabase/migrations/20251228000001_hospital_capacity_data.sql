-- Insert sample hospital capacity data for admin management

-- First, ensure we have hospitals in the system
INSERT INTO public.hospitals (id, name, location_lat, location_lng, address, phone, specialties) VALUES
('h1', 'AIIMS Delhi', 28.5672, 77.2100, 'Ansari Nagar, New Delhi', '+91-11-26588500', '["cardiology", "neurology", "oncology", "emergency"]'),
('h2', 'Safdarjung Hospital', 28.5738, 77.2088, 'Ring Road, New Delhi', '+91-11-26165060', '["general", "trauma", "emergency"]'),
('h3', 'Apollo Hospital', 28.5245, 77.2066, 'Sarita Vihar, New Delhi', '+91-11-26925858', '["cardiology", "oncology", "neurology"]'),
('h4', 'Max Super Speciality Hospital', 28.5355, 77.2633, 'Saket, New Delhi', '+91-11-26515050', '["cardiology", "orthopedics", "emergency"]'),
('h5', 'Fortis Hospital', 28.4595, 77.0266, 'Sector 62, Noida', '+91-120-3988888', '["cardiology", "neurology", "emergency"]')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  location_lat = EXCLUDED.location_lat,
  location_lng = EXCLUDED.location_lng,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  specialties = EXCLUDED.specialties;

-- Insert hospital capacity data
INSERT INTO public.hospital_capacity (hospital_id, total_beds, occupied_beds, icu_beds, occupied_icu_beds, emergency_beds, occupied_emergency_beds, is_accepting_patients) VALUES
('h1', 2500, 2100, 200, 180, 50, 35, true),
('h2', 1800, 1650, 150, 140, 40, 38, false),
('h3', 1200, 950, 100, 85, 30, 25, true),
('h4', 800, 600, 80, 65, 25, 20, true),
('h5', 600, 480, 60, 50, 20, 15, true)
ON CONFLICT (hospital_id) DO UPDATE SET
  total_beds = EXCLUDED.total_beds,
  occupied_beds = EXCLUDED.occupied_beds,
  icu_beds = EXCLUDED.icu_beds,
  occupied_icu_beds = EXCLUDED.occupied_icu_beds,
  emergency_beds = EXCLUDED.emergency_beds,
  occupied_emergency_beds = EXCLUDED.occupied_emergency_beds,
  is_accepting_patients = EXCLUDED.is_accepting_patients,
  last_updated = timezone('utc'::text, now());