-- Allow hospital users to update ambulance status (for releasing ambulances)
CREATE POLICY "Hospital users can update ambulance status" 
ON public.ambulances 
FOR UPDATE 
USING (has_role(auth.uid(), 'hospital'::user_role));