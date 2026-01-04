-- Allow admins to view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Allow admins to update any profile (for approval)
CREATE POLICY "Admins can update any profile"
ON public.profiles
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- Allow admins to view all ambulances
CREATE POLICY "Admins can view all ambulances"
ON public.ambulances
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Allow admins to update any ambulance
CREATE POLICY "Admins can update any ambulance"
ON public.ambulances
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));