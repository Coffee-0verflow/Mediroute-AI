import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Crosshair } from 'lucide-react';


// Fix for default marker icons in Leaflet with bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface MapProps {
  center?: [number, number];
  zoom?: number;
  markers?: Array<{
    position: [number, number];
    popup?: string;
    icon?: 'ambulance' | 'signal' | 'hospital';
    highlighted?: boolean;
  }>;
  /** Route coordinates to draw as a polyline */
  route?: [number, number][];
  className?: string;
  /** If true, map will follow center prop changes. Default false (user controls view). */
  followCenter?: boolean;
}

const createCustomIcon = (type: 'ambulance' | 'signal' | 'hospital', highlighted: boolean = false) => {
  const colors = {
    ambulance: highlighted ? '#dc2626' : '#ef4444',
    signal: '#22c55e',
    hospital: '#3b82f6',
  };
  
  const size = highlighted ? 36 : 24;
  const border = highlighted ? '4px solid #fbbf24' : '3px solid white';
  
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      background-color: ${colors[type]};
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      border: ${border};
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      ${highlighted ? 'animation: pulse 1.5s ease-in-out infinite;' : ''}
    "></div>
    <style>
      @keyframes pulse {
        0%, 100% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.15); opacity: 0.9; }
      }
    </style>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
};

export default function Map({ 
  center = [12.9716, 77.5946], // Bangalore default
  zoom = 13,
  markers = [],
  route,
  className = '',
  followCenter = false,
}: MapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const routeLayerRef = useRef<L.Polyline | null>(null);
  const initializedRef = useRef(false);
  const locateMe = () => {
  if (!navigator.geolocation || !mapRef.current) return;

 navigator.geolocation.getCurrentPosition(pos => {
   const lat = pos.coords.latitude;
   const lng = pos.coords.longitude;

   mapRef.current!.setView([lat, lng], 17, { animate: true });
 });
};

  // Validate and get safe center coordinates
  const getSafeCenter = (coords: [number, number] | undefined | null): [number, number] => {
    if (!coords || coords.length !== 2 || 
        typeof coords[0] !== 'number' || typeof coords[1] !== 'number' ||
        isNaN(coords[0]) || isNaN(coords[1]) ||
        coords[0] === 0 && coords[1] === 0) {
      return [12.9716, 77.5946]; // Default to Bangalore
    }
    return coords;
  };

  const safeCenter = getSafeCenter(center);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    // Initialize map with validated center
    mapRef.current = L.map(mapContainer.current).setView(safeCenter, zoom);

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(mapRef.current);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update center only on first render or when followCenter is true
  useEffect(() => {
    if (!mapRef.current) return;

    const validCenter = getSafeCenter(center);

    // Always set view on first initialization
    if (!initializedRef.current) {
      mapRef.current.setView(validCenter, zoom);
      initializedRef.current = true;
      return;
    }

    // Only follow center updates if explicitly requested
    if (followCenter) {
      mapRef.current.setView(validCenter, zoom);
    }
  }, [center, zoom, followCenter]);

  // Validate marker position
  const isValidPosition = (pos: [number, number] | undefined | null): pos is [number, number] => {
    return pos !== null && 
           pos !== undefined && 
           Array.isArray(pos) && 
           pos.length === 2 &&
           typeof pos[0] === 'number' && 
           typeof pos[1] === 'number' &&
           !isNaN(pos[0]) && 
           !isNaN(pos[1]) &&
           !(pos[0] === 0 && pos[1] === 0);
  };

  // Update markers
  useEffect(() => {
    if (!mapRef.current) return;

    // Remove existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Add new markers (only those with valid positions)
    markers.forEach(({ position, popup, icon, highlighted }) => {
      if (!isValidPosition(position)) {
        console.warn('Skipping marker with invalid position:', position);
        return;
      }

      const marker = L.marker(position, {
        icon: icon ? createCustomIcon(icon, highlighted) : undefined,
        zIndexOffset: highlighted ? 1000 : 0
      }).addTo(mapRef.current!);
      
      if (popup) {
        marker.bindPopup(popup);
      }
      
      markersRef.current.push(marker);
    });
  }, [markers]);

  // Draw route polyline
  useEffect(() => {
    if (!mapRef.current) return;

    // Remove existing route
    if (routeLayerRef.current) {
      routeLayerRef.current.remove();
      routeLayerRef.current = null;
    }

    // Add new route
    if (route && route.length > 1) {
      routeLayerRef.current = L.polyline(route, {
        color: '#3b82f6',
        weight: 5,
        opacity: 0.8,
        lineJoin: 'round'
      }).addTo(mapRef.current);

      // Fit bounds to show the entire route
      const bounds = L.latLngBounds(route);
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [route]);

  return (
 <div className="relative w-full h-full">
   {/* Locate Me Button */}
   <button
     onClick={locateMe}
     className="absolute top-3 right-3 z-[1000] bg-white shadow-lg rounded-full p-2 hover:bg-gray-100"
     title="Locate Me"
   >
     <Crosshair size={20} className="text-red-600" />
   </button>

   <div
     ref={mapContainer}
     className={`w-full h-full min-h-[300px] rounded-lg ${className}`}
     style={{ zIndex: 0 }}
   />
 </div>
);

}
