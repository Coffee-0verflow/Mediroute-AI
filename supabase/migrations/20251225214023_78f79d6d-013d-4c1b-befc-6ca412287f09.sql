-- Make driver_id nullable on ambulances table so we can create unassigned ambulances
ALTER TABLE public.ambulances ALTER COLUMN driver_id DROP NOT NULL;

-- Update the admin insert policy to allow creating ambulances without a driver
DROP POLICY IF EXISTS "Admins can create ambulances" ON public.ambulances;

CREATE POLICY "Admins can create ambulances"
ON public.ambulances
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));