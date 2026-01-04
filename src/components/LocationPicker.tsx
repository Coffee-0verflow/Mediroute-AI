import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, MapPin, X } from 'lucide-react';

interface LocationPickerProps {
  onLocationSelect: (lat: number, lng: number, address?: string) => void;
  initialLat?: number;
  initialLng?: number;
  className?: string;
}

interface SearchResult {
  display_name: string;
  lat: string;
  lon: string;
}

export default function LocationPicker({
  onLocationSelect,
  initialLat = 30.7333,
  initialLng = 76.7794,
  className = ''
}: LocationPickerProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<string>('');
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    mapRef.current = L.map(mapContainer.current).setView([initialLat, initialLng], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(mapRef.current);

    // Add click handler to place marker
    mapRef.current.on('click', async (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      placeMarker(lat, lng);
      
      // Reverse geocode to get address
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
        );
        const data = await response.json();
        const address = data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        setSelectedAddress(address);
        setSelectedCoords({ lat, lng });
        onLocationSelect(lat, lng, address);
      } catch {
        setSelectedAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
        setSelectedCoords({ lat, lng });
        onLocationSelect(lat, lng);
      }
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  const placeMarker = useCallback((lat: number, lng: number) => {
    if (!mapRef.current) return;

    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else {
      const pickupIcon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="
          width: 32px;
          height: 32px;
          background: hsl(0, 84%, 60%);
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
        "><div style="transform: rotate(45deg); color: white; font-weight: bold;">📍</div></div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 32]
      });
      markerRef.current = L.marker([lat, lng], { icon: pickupIcon }).addTo(mapRef.current);
    }

    mapRef.current.setView([lat, lng], 15);
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5`
      );
      const data: SearchResult[] = await response.json();
      setSearchResults(data);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const selectSearchResult = (result: SearchResult) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    placeMarker(lat, lng);
    setSelectedAddress(result.display_name);
    setSelectedCoords({ lat, lng });
    setSearchResults([]);
    setSearchQuery('');
    onLocationSelect(lat, lng, result.display_name);
  };

  const clearSelection = () => {
    if (markerRef.current && mapRef.current) {
      mapRef.current.removeLayer(markerRef.current);
      markerRef.current = null;
    }
    setSelectedAddress('');
    setSelectedCoords(null);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Input
            placeholder="Search address or place..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="pr-10"
          />
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        </div>
        <Button onClick={handleSearch} disabled={isSearching}>
          {isSearching ? 'Searching...' : 'Search'}
        </Button>
      </div>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="bg-card border border-border rounded-lg overflow-hidden max-h-48 overflow-y-auto">
          {searchResults.map((result, index) => (
            <button
              key={index}
              className="w-full text-left px-4 py-3 hover:bg-muted transition-colors border-b border-border last:border-b-0"
              onClick={() => selectSearchResult(result)}
            >
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 mt-1 text-emergency flex-shrink-0" />
                <span className="text-sm line-clamp-2">{result.display_name}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Map */}
      <div 
        ref={mapContainer} 
        className="h-[300px] rounded-xl overflow-hidden border border-border"
      />

      {/* Selected Location */}
      {selectedCoords && (
        <div className="p-4 bg-emergency/10 border border-emergency/30 rounded-lg">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <p className="text-sm font-medium text-emergency mb-1">Selected Pickup Location</p>
              <p className="text-sm text-muted-foreground line-clamp-2">{selectedAddress}</p>
              <p className="text-xs font-mono mt-1">
                {selectedCoords.lat.toFixed(6)}, {selectedCoords.lng.toFixed(6)}
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={clearSelection}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center">
        Click on the map or search to select the patient pickup location
      </p>
    </div>
  );
}
