-- Create emergency_tokens table for tracking emergency requests with token-based flow
CREATE TABLE public.emergency_tokens (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    token_code text NOT NULL UNIQUE DEFAULT substr(md5(random()::text), 1, 8),
    ambulance_id uuid NOT NULL REFERENCES public.ambulances(id) ON DELETE CASCADE,
    
    -- Pickup location (entered by ambulance driver)
    pickup_lat double precision NOT NULL,
    pickup_lng double precision NOT NULL,
    pickup_address text,
    
    -- Assigned hospital
    hospital_id uuid REFERENCES public.profiles(id),
    hospital_name text,
    hospital_lat double precision,
    hospital_lng double precision,
    
    -- Route data (JSON for flexibility with OSRM response)
    selected_route jsonb,
    route_type text, -- 'shortest' or 'fastest'
    route_distance_meters double precision,
    route_duration_seconds double precision,
    
    -- Status tracking
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'route_selected', 'in_progress', 'completed', 'cancelled')),
    
    -- Timestamps
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    assigned_at timestamp with time zone,
    started_at timestamp with time zone,
    completed_at timestamp with time zone
);

-- Enable RLS
ALTER TABLE public.emergency_tokens ENABLE ROW LEVEL SECURITY;

-- Ambulance drivers can view and create tokens for their own ambulance
CREATE POLICY "Ambulance drivers can view own tokens"
ON public.emergency_tokens
FOR SELECT
USING (
    ambulance_id IN (
        SELECT id FROM public.ambulances WHERE driver_id = auth.uid()
    )
);

CREATE POLICY "Ambulance drivers can create tokens"
ON public.emergency_tokens
FOR INSERT
WITH CHECK (
    ambulance_id IN (
        SELECT id FROM public.ambulances WHERE driver_id = auth.uid()
    )
);

CREATE POLICY "Ambulance drivers can update own tokens"
ON public.emergency_tokens
FOR UPDATE
USING (
    ambulance_id IN (
        SELECT id FROM public.ambulances WHERE driver_id = auth.uid()
    )
);

-- Hospital users can view and update tokens assigned to them or pending
CREATE POLICY "Hospital users can view pending and assigned tokens"
ON public.emergency_tokens
FOR SELECT
USING (
    has_role(auth.uid(), 'hospital'::user_role) AND (
        status = 'pending' OR hospital_id = auth.uid()
    )
);

CREATE POLICY "Hospital users can update assigned tokens"
ON public.emergency_tokens
FOR UPDATE
USING (
    has_role(auth.uid(), 'hospital'::user_role) AND (
        status = 'pending' OR hospital_id = auth.uid()
    )
);

-- Create index for faster lookups
CREATE INDEX idx_emergency_tokens_status ON public.emergency_tokens(status);
CREATE INDEX idx_emergency_tokens_ambulance ON public.emergency_tokens(ambulance_id);
CREATE INDEX idx_emergency_tokens_hospital ON public.emergency_tokens(hospital_id);

-- Enable realtime for emergency_tokens
ALTER PUBLICATION supabase_realtime ADD TABLE public.emergency_tokens;

-- Add active_token_id to ambulances to link current emergency
ALTER TABLE public.ambulances ADD COLUMN active_token_id uuid REFERENCES public.emergency_tokens(id);