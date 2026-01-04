-- Allow admins to delete ambulances
CREATE POLICY "Admins can delete ambulances"
ON public.ambulances
FOR DELETE
USING (has_role(auth.uid(), 'admin'::user_role));

-- Allow admins to delete driver profiles
CREATE POLICY "Admins can delete driver profiles"
ON public.profiles
FOR DELETE
USING (has_role(auth.uid(), 'admin'::user_role));