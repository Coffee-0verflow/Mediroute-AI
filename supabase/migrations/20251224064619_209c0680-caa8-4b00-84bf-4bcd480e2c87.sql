-- Allow hospital users to create emergency tokens
CREATE POLICY "Hospital users can create tokens"
ON public.emergency_tokens
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'hospital'::user_role)
);