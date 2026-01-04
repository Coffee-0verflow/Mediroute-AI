-- Create enum for user roles
CREATE TYPE public.user_role AS ENUM ('ambulance', 'hospital', 'admin');

-- Create enum for emergency status
CREATE TYPE public.emergency_status AS ENUM ('inactive', 'active', 'responding');

-- Create enum for route direction
CREATE TYPE public.route_direction AS ENUM ('N_S', 'S_N', 'E_W', 'W_E');

-- Create enum for signal status
CREATE TYPE public.signal_status AS ENUM ('normal', 'prepare', 'priority');

-- Create profiles table for user management
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role user_role NOT NULL DEFAULT 'ambulance',
  organization_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create ambulances table for tracking
CREATE TABLE public.ambulances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  vehicle_number TEXT NOT NULL,
  current_lat DOUBLE PRECISION DEFAULT 0,
  current_lng DOUBLE PRECISION DEFAULT 0,
  heading DOUBLE PRECISION DEFAULT 0,
  speed DOUBLE PRECISION DEFAULT 0,
  emergency_status emergency_status NOT NULL DEFAULT 'inactive',
  route_direction route_direction,
  destination_lat DOUBLE PRECISION,
  destination_lng DOUBLE PRECISION,
  destination_name TEXT,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create traffic signals table
CREATE TABLE public.traffic_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_name TEXT NOT NULL,
  location_lat DOUBLE PRECISION NOT NULL,
  location_lng DOUBLE PRECISION NOT NULL,
  current_status signal_status NOT NULL DEFAULT 'normal',
  direction_ns TEXT NOT NULL DEFAULT 'RED',
  direction_sn TEXT NOT NULL DEFAULT 'RED',
  direction_ew TEXT NOT NULL DEFAULT 'GREEN',
  direction_we TEXT NOT NULL DEFAULT 'GREEN',
  priority_direction route_direction,
  activated_by UUID REFERENCES public.ambulances(id),
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create signal activation logs
CREATE TABLE public.signal_activations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id UUID NOT NULL REFERENCES public.traffic_signals(id) ON DELETE CASCADE,
  ambulance_id UUID NOT NULL REFERENCES public.ambulances(id) ON DELETE CASCADE,
  activation_type TEXT NOT NULL,
  distance_meters DOUBLE PRECISION NOT NULL,
  activated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ambulances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.traffic_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signal_activations ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Allow insert during signup"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Hospital users can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'hospital'
    )
  );

-- Ambulances policies
CREATE POLICY "Ambulance drivers can manage their own ambulance"
  ON public.ambulances FOR ALL
  USING (driver_id = auth.uid());

CREATE POLICY "Hospital users can view all ambulances"
  ON public.ambulances FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'hospital'
    )
  );

-- Traffic signals policies (public read for IoT devices, authenticated write)
CREATE POLICY "Anyone can view traffic signals"
  ON public.traffic_signals FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can update signals"
  ON public.traffic_signals FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert signals"
  ON public.traffic_signals FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Signal activations policies
CREATE POLICY "Authenticated users can view activations"
  ON public.signal_activations FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert activations"
  ON public.signal_activations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Enable realtime for ambulances and traffic_signals
ALTER PUBLICATION supabase_realtime ADD TABLE public.ambulances;
ALTER PUBLICATION supabase_realtime ADD TABLE public.traffic_signals;

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'full_name',
    COALESCE((NEW.raw_user_meta_data ->> 'role')::user_role, 'ambulance')
  );
  RETURN NEW;
END;
$$;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to calculate distance between two points (Haversine formula)
CREATE OR REPLACE FUNCTION public.calculate_distance(
  lat1 DOUBLE PRECISION,
  lng1 DOUBLE PRECISION,
  lat2 DOUBLE PRECISION,
  lng2 DOUBLE PRECISION
)
RETURNS DOUBLE PRECISION
LANGUAGE plpgsql
AS $$
DECLARE
  R DOUBLE PRECISION := 6371000; -- Earth's radius in meters
  dLat DOUBLE PRECISION;
  dLng DOUBLE PRECISION;
  a DOUBLE PRECISION;
  c DOUBLE PRECISION;
BEGIN
  dLat := radians(lat2 - lat1);
  dLng := radians(lng2 - lng1);
  a := sin(dLat/2) * sin(dLat/2) + cos(radians(lat1)) * cos(radians(lat2)) * sin(dLng/2) * sin(dLng/2);
  c := 2 * atan2(sqrt(a), sqrt(1-a));
  RETURN R * c;
END;
$$;

-- Function to update timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Insert sample traffic signals
INSERT INTO public.traffic_signals (signal_name, location_lat, location_lng) VALUES
  ('Junction A - Main Street', 28.6139, 77.2090),
  ('Junction B - Hospital Road', 28.6159, 77.2110),
  ('Junction C - Highway Entry', 28.6179, 77.2130),
  ('Junction D - City Center', 28.6199, 77.2150);