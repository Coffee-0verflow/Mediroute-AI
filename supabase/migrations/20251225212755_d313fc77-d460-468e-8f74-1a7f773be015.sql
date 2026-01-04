-- Add is_approved column to profiles for ambulance driver verification
ALTER TABLE public.profiles
ADD COLUMN is_approved boolean NOT NULL DEFAULT false;

-- Add ambulance_id column to link drivers to their ambulances
ALTER TABLE public.profiles
ADD COLUMN ambulance_id uuid REFERENCES public.ambulances(id) ON DELETE SET NULL;

-- Create a function to check if ambulance driver is approved
CREATE OR REPLACE FUNCTION public.is_approved_ambulance_driver(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.ambulances a ON a.driver_id = p.id
    WHERE p.id = _user_id
      AND p.role = 'ambulance'
      AND p.is_approved = true
  );
$$;

-- Update emergency_tokens RLS policy to only allow approved ambulance drivers
DROP POLICY IF EXISTS "Ambulance drivers can create tokens" ON public.emergency_tokens;

CREATE POLICY "Approved ambulance drivers can create tokens"
ON public.emergency_tokens
FOR INSERT
WITH CHECK (
  ambulance_id IN (
    SELECT a.id
    FROM ambulances a
    JOIN profiles p ON p.id = a.driver_id
    WHERE a.driver_id = auth.uid()
      AND p.is_approved = true
  )
);

-- Update the view policy for ambulance drivers
DROP POLICY IF EXISTS "Ambulance drivers can view own tokens" ON public.emergency_tokens;

CREATE POLICY "Approved ambulance drivers can view own tokens"
ON public.emergency_tokens
FOR SELECT
USING (
  ambulance_id IN (
    SELECT a.id
    FROM ambulances a
    JOIN profiles p ON p.id = a.driver_id
    WHERE a.driver_id = auth.uid()
      AND p.is_approved = true
  )
);

-- Update the update policy for ambulance drivers
DROP POLICY IF EXISTS "Ambulance drivers can update own tokens" ON public.emergency_tokens;

CREATE POLICY "Approved ambulance drivers can update own tokens"
ON public.emergency_tokens
FOR UPDATE
USING (
  ambulance_id IN (
    SELECT a.id
    FROM ambulances a
    JOIN profiles p ON p.id = a.driver_id
    WHERE a.driver_id = auth.uid()
      AND p.is_approved = true
  )
);

-- Update ambulance management policy to require approval
DROP POLICY IF EXISTS "Ambulance drivers can manage their own ambulance" ON public.ambulances;

CREATE POLICY "Approved drivers can manage their ambulance"
ON public.ambulances
FOR ALL
USING (
  driver_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND is_approved = true
  )
);

-- Update ambulance insert policy
DROP POLICY IF EXISTS "Drivers can insert own ambulance" ON public.ambulances;

-- Only admins can create ambulances (no self-registration)
CREATE POLICY "Admins can create ambulances"
ON public.ambulances
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin')
);

-- Update ambulance update policy for approved drivers
DROP POLICY IF EXISTS "Drivers can update own ambulance" ON public.ambulances;

CREATE POLICY "Approved drivers can update own ambulance"
ON public.ambulances
FOR UPDATE
USING (
  driver_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND is_approved = true
  )
);