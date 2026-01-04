-- Add decline_reason column to emergency_tokens
ALTER TABLE public.emergency_tokens 
ADD COLUMN IF NOT EXISTS decline_reason text;

-- Update status constraint to include 'declined'
ALTER TABLE public.emergency_tokens DROP CONSTRAINT IF EXISTS emergency_tokens_status_check;
ALTER TABLE public.emergency_tokens ADD CONSTRAINT emergency_tokens_status_check 
CHECK (status IN ('pending', 'assigned', 'route_selected', 'in_progress', 'at_patient', 'to_hospital', 'completed', 'cancelled', 'declined'));