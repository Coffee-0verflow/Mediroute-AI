-- Drop all existing problematic policies on profiles
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON profiles;

-- Drop all existing problematic policies on ambulances
DROP POLICY IF EXISTS "Ambulance drivers can view own ambulance" ON ambulances;
DROP POLICY IF EXISTS "Ambulance drivers can update own ambulance" ON ambulances;
DROP POLICY IF EXISTS "Ambulance drivers can insert own ambulance" ON ambulances;
DROP POLICY IF EXISTS "Hospital staff can view all ambulances" ON ambulances;
DROP POLICY IF EXISTS "Authenticated users can view ambulances" ON ambulances;

-- Create simple non-recursive policies for profiles
CREATE POLICY "Users can view own profile" 
ON profiles FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
ON profiles FOR UPDATE 
USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" 
ON profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Create simple non-recursive policies for ambulances
-- Allow authenticated users to view all ambulances (needed for hospital dashboard)
CREATE POLICY "Authenticated users can view ambulances" 
ON ambulances FOR SELECT 
TO authenticated 
USING (true);

-- Allow ambulance drivers to manage their own ambulance
CREATE POLICY "Drivers can insert own ambulance" 
ON ambulances FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = driver_id);

CREATE POLICY "Drivers can update own ambulance" 
ON ambulances FOR UPDATE 
TO authenticated 
USING (auth.uid() = driver_id);