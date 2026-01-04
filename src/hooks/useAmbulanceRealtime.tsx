import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Ambulance } from '@/types/database';

export function useAmbulanceRealtime() {
  const [ambulances, setAmbulances] = useState<Ambulance[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch all active ambulances
  const fetchAmbulances = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('ambulances')
        .select('*')
        .order('last_updated', { ascending: false });

      if (error) throw error;
      setAmbulances(data as Ambulance[]);
    } catch (error) {
      console.error('Error fetching ambulances:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAmbulances();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('ambulances-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ambulances',
        },
        (payload) => {
          console.log('[useAmbulanceRealtime] change:', payload.eventType);

          if (payload.eventType === 'INSERT') {
            setAmbulances((prev) => [payload.new as Ambulance, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as Partial<Ambulance> & { id: string };
            setAmbulances((prev) =>
              prev.map((a) => (a.id === updated.id ? ({ ...a, ...updated } as Ambulance) : a))
            );
          } else if (payload.eventType === 'DELETE') {
            setAmbulances((prev) => prev.filter((a) => a.id !== payload.old.id));
          }
        }
      );

    channel.subscribe((status) => {
      console.log('[useAmbulanceRealtime] channel status:', status);
    });

    // Fallback polling to ensure the hospital UI updates even if realtime is delayed
    const pollId = window.setInterval(() => {
      fetchAmbulances();
    }, 5000);

    return () => {
      window.clearInterval(pollId);
      supabase.removeChannel(channel);
    };
  }, [fetchAmbulances]);

  // Get only ambulances with active emergency
  const activeEmergencies = ambulances.filter(a => a.emergency_status === 'active');

  return {
    ambulances,
    activeEmergencies,
    loading,
    refreshAmbulances: fetchAmbulances,
  };
}
