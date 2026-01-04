-- Add columns for two-leg journey: ambulance → patient → hospital
-- Leg 1: Route from ambulance current location to patient pickup
-- Leg 2: Route from patient pickup to hospital

-- Add columns for leg 1 (to patient) route
ALTER TABLE public.emergency_tokens 
ADD COLUMN IF NOT EXISTS route_to_patient jsonb,
ADD COLUMN IF NOT EXISTS route_to_patient_distance_meters double precision,
ADD COLUMN IF NOT EXISTS route_to_patient_duration_seconds double precision,
ADD COLUMN IF NOT EXISTS arrived_at_patient_at timestamp with time zone;

-- Add columns for leg 2 (to hospital) route
ALTER TABLE public.emergency_tokens 
ADD COLUMN IF NOT EXISTS route_to_hospital jsonb,
ADD COLUMN IF NOT EXISTS route_to_hospital_distance_meters double precision,
ADD COLUMN IF NOT EXISTS route_to_hospital_duration_seconds double precision;

-- Add ambulance origin location (where ambulance was when token was created)
ALTER TABLE public.emergency_tokens 
ADD COLUMN IF NOT EXISTS ambulance_origin_lat double precision,
ADD COLUMN IF NOT EXISTS ambulance_origin_lng double precision;

-- Update the status check constraint to include 'at_patient' status
-- First drop the existing constraint
ALTER TABLE public.emergency_tokens DROP CONSTRAINT IF EXISTS emergency_tokens_status_check;

-- Add the new constraint with 'at_patient' status
ALTER TABLE public.emergency_tokens ADD CONSTRAINT emergency_tokens_status_check 
CHECK (status IN ('pending', 'assigned', 'route_selected', 'in_progress', 'at_patient', 'to_hospital', 'completed', 'cancelled'));