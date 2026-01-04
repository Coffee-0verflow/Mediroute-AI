import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { Ambulance, EmergencyStatus, RouteDirection, getRouteDirection } from '@/types/database';
import { useToast } from './use-toast';

export function useAmbulance() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [ambulance, setAmbulance] = useState<Ambulance | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSimulating, setIsSimulating] = useState(false);
  const [locationPermission, setLocationPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');
  const didInitLocationRef = useRef(false);

  // Check location permission on mount
  useEffect(() => {
    if ('permissions' in navigator) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        setLocationPermission(result.state);
        result.onchange = () => {
          setLocationPermission(result.state);
        };
      });
    }
  }, []);

  // Fetch or create ambulance for current user
  const fetchAmbulance = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('ambulances')
        .select('*')
        .eq('driver_id', user.id)
        .single();

      if (error && error.code === 'PGRST116') {
        // No ambulance found, create one
        const { data: newAmbulance, error: createError } = await supabase
          .from('ambulances')
          .insert({
            driver_id: user.id,
            vehicle_number: `AMB-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
            current_lat: null,
            current_lng: null,
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating ambulance:', createError);
          return;
        }

        setAmbulance(newAmbulance as Ambulance);
      } else if (error) {
        console.error('Error fetching ambulance:', error);
      } else {
        setAmbulance(data as Ambulance);
      }
    } catch (error) {
      console.error('Error in fetchAmbulance:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAmbulance();
  }, [fetchAmbulance]);

  // Request location permission and get current position
  const requestLocationAndActivate = (): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (!('geolocation' in navigator)) {
        reject(new Error('Geolocation is not supported by your browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve(position);
        },
        (error) => {
          let errorMessage = 'Failed to get location';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location permission denied. Please enable location access in your browser settings.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information is unavailable.';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out.';
              break;
          }
          reject(new Error(errorMessage));
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  };

  // Toggle emergency status with location permission
  const toggleEmergency = async () => {
    if (!ambulance) return;

    const isActivating = ambulance.emergency_status !== 'active';

    // If activating, request location first
    if (isActivating) {
      try {
        if (locationPermission === 'denied') {
          toast({
            title: 'Location blocked',
            description: 'Enable location permission in your browser to activate emergency mode.',
            variant: 'destructive',
          });
          return;
        }

        toast({
          title: '📍 Requesting Location',
          description: 'Please allow location access to activate emergency mode.',
        });

        const position = await requestLocationAndActivate();
        
        // Update location in database first
        const { error: locationError } = await supabase
          .from('ambulances')
          .update({
            current_lat: position.coords.latitude,
            current_lng: position.coords.longitude,
            heading: position.coords.heading || 0,
            speed: (position.coords.speed || 0) * 3.6, // Convert m/s to km/h
            route_direction: getRouteDirection(position.coords.heading || 0),
            last_updated: new Date().toISOString(),
          })
          .eq('id', ambulance.id);

        if (locationError) {
          console.error('Error updating location:', locationError);
        }

        // Now activate emergency
        const { error } = await supabase
          .from('ambulances')
          .update({ 
            emergency_status: 'active',
            last_updated: new Date().toISOString(),
          })
          .eq('id', ambulance.id);

        if (error) throw error;

        setAmbulance(prev => prev ? { 
          ...prev, 
          emergency_status: 'active',
          current_lat: position.coords.latitude,
          current_lng: position.coords.longitude,
          heading: position.coords.heading || 0,
          speed: (position.coords.speed || 0) * 3.6,
          route_direction: getRouteDirection(position.coords.heading || 0),
        } : null);
        
        toast({
          title: '🚨 Emergency Activated',
          description: 'Your location is being shared with the hospital. Traffic signals will be prioritized.',
          variant: 'destructive',
        });

      } catch (error) {
        console.error('Error activating emergency:', error);
        toast({
          title: 'Failed to Activate Emergency',
          description: error instanceof Error ? error.message : 'Please enable location access and try again.',
          variant: 'destructive',
        });
        return;
      }
    } else {
      // Deactivating emergency
      try {
        const { error } = await supabase
          .from('ambulances')
          .update({ 
            emergency_status: 'inactive',
            last_updated: new Date().toISOString(),
          })
          .eq('id', ambulance.id);

        if (error) throw error;

        setAmbulance(prev => prev ? { ...prev, emergency_status: 'inactive' } : null);
        
        toast({
          title: '✅ Emergency Deactivated',
          description: 'Returning to normal operation.',
        });
      } catch (error) {
        console.error('Error deactivating emergency:', error);
        toast({
          title: 'Error',
          description: 'Failed to deactivate emergency status.',
          variant: 'destructive',
        });
      }
    }
  };

  // Update location
  const updateLocation = async (lat: number, lng: number, heading: number = 0, speed: number = 0) => {
    if (!ambulance) return;

    const routeDirection = getRouteDirection(heading);

    try {
      const { error } = await supabase
        .from('ambulances')
        .update({
          current_lat: lat,
          current_lng: lng,
          heading,
          speed,
          route_direction: routeDirection,
          last_updated: new Date().toISOString(),
        })
        .eq('id', ambulance.id);

      if (error) throw error;

      setAmbulance(prev => prev ? { 
        ...prev, 
        current_lat: lat, 
        current_lng: lng,
        heading,
        speed,
        route_direction: routeDirection,
      } : null);
    } catch (error) {
      console.error('Error updating location:', error);
    }
  };

  // Initialize location once (so map doesn't default to a random city)
  useEffect(() => {
    if (!ambulance || didInitLocationRef.current) return;

    const isMissingCoords = ambulance.current_lat == null || ambulance.current_lng == null;
    const isDefaultDelhi = ambulance.current_lat === 28.6139 && ambulance.current_lng === 77.2090;

    if (!isMissingCoords && !isDefaultDelhi) return;

    didInitLocationRef.current = true;

    (async () => {
      try {
        const position = await requestLocationAndActivate();
        await updateLocation(
          position.coords.latitude,
          position.coords.longitude,
          position.coords.heading || 0,
          (position.coords.speed || 0) * 3.6,
        );
      } catch {
        // Non-blocking: user can enable location later via Emergency button.
      }
    })();
  }, [ambulance, updateLocation]);

  // Set destination
  const setDestination = async (lat: number, lng: number, name: string) => {
    if (!ambulance) return;

    try {
      const { error } = await supabase
        .from('ambulances')
        .update({
          destination_lat: lat,
          destination_lng: lng,
          destination_name: name,
          last_updated: new Date().toISOString(),
        })
        .eq('id', ambulance.id);

      if (error) throw error;

      setAmbulance(prev => prev ? { 
        ...prev, 
        destination_lat: lat, 
        destination_lng: lng,
        destination_name: name,
      } : null);

      toast({
        title: '🏥 Destination Set',
        description: `Navigating to ${name}`,
      });
    } catch (error) {
      console.error('Error setting destination:', error);
      toast({
        title: 'Error',
        description: 'Failed to set destination.',
        variant: 'destructive',
      });
    }
  };

  // Start simulated movement
  const startSimulation = () => {
    setIsSimulating(true);
    toast({
      title: '🔄 Simulation Started',
      description: 'GPS location is being simulated for testing.',
    });
  };

  // Stop simulated movement
  const stopSimulation = () => {
    setIsSimulating(false);
    toast({
      title: '⏹️ Simulation Stopped',
      description: 'GPS simulation has been stopped.',
    });
  };

  return {
    ambulance,
    loading,
    isSimulating,
    locationPermission,
    toggleEmergency,
    updateLocation,
    setDestination,
    startSimulation,
    stopSimulation,
    refreshAmbulance: fetchAmbulance,
  };
}
