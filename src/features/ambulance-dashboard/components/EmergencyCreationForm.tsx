import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { Radio, Power, MapPin, Heart, Ticket, Check, ChevronsUpDown } from 'lucide-react';
import { EmergencyType, LocationSuggestion, PickupLocation } from '../types';
import { searchLocationSuggestions } from '../services/locationService';
import { toast } from 'sonner';

interface EmergencyCreationFormProps {
  onCreateToken: (location: PickupLocation, emergencyType: string, customType?: string) => void;
  onCancel: () => void;
  isCreating: boolean;
  onEnableMapSelection?: () => void;
  pickupLocation?: PickupLocation | null;
}

const emergencyTypes: EmergencyType[] = [
  { id: 'cardiac', label: 'Cardiac Emergency (Heart Attack)', keyword: 'Cardiac', icon: '❤️' },
  { id: 'accident', label: 'Accident / Trauma', keyword: 'Trauma', icon: '🚗' },
  { id: 'stroke', label: 'Stroke / Neurological Emergency', keyword: 'Neuro', icon: '🧠' },
  { id: 'cancer', label: 'Cancer-related Emergency', keyword: 'Oncology', icon: '🎗️' },
  { id: 'pregnancy', label: 'Pregnancy / Delivery', keyword: 'Maternity', icon: '👶' },
  { id: 'respiratory', label: 'Respiratory Distress', keyword: 'Pulmonary', icon: '🫁' },
  { id: 'pediatric', label: 'Pediatric Emergency', keyword: 'Pediatric', icon: '👶' },
  { id: 'general', label: 'General Emergency', keyword: 'General', icon: '🏥' },
  { id: 'custom', label: 'Custom Emergency Type', keyword: 'Custom', icon: '✏️' }
];

export const EmergencyCreationForm: React.FC<EmergencyCreationFormProps> = ({
  onCreateToken,
  onCancel,
  isCreating,
  onEnableMapSelection,
  pickupLocation: externalPickupLocation
}) => {
  const [showForm, setShowForm] = useState(false);
  const [pickupLocation, setPickupLocation] = useState<PickupLocation | null>(externalPickupLocation || null);
  const [emergencyType, setEmergencyType] = useState<string>('');
  const [customEmergencyType, setCustomEmergencyType] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearching, setIsSearching] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState<LocationSuggestion[]>([]);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');

  // Sync external pickup location
  useEffect(() => {
    if (externalPickupLocation) {
      setPickupLocation(externalPickupLocation);
      if (externalPickupLocation.address) {
        setSearchQuery(externalPickupLocation.address);
      }
    }
  }, [externalPickupLocation]);

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      if (searchQuery && showLocationDropdown) {
        setIsSearching(true);
        const suggestions = await searchLocationSuggestions(searchQuery);
        setLocationSuggestions(suggestions);
        setIsSearching(false);
      }
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, showLocationDropdown]);

  const selectLocationFromDropdown = (suggestion: LocationSuggestion) => {
    setPickupLocation({ lat: suggestion.lat, lng: suggestion.lng, address: suggestion.name });
    setSelectedLocationId(suggestion.id);
    setSearchQuery(suggestion.name);
    setShowLocationDropdown(false);
    toast.success(`Location selected: ${suggestion.name}`);
  };

  const handleCreateToken = () => {
    if (!pickupLocation || !emergencyType) {
      toast.error('Please select emergency type and pickup location');
      return;
    }

    if (emergencyType === 'custom' && !customEmergencyType.trim()) {
      toast.error('Please enter custom emergency type');
      return;
    }

    onCreateToken(pickupLocation, emergencyType, customEmergencyType);
  };

  const resetForm = () => {
    setShowForm(false);
    setPickupLocation(null);
    setEmergencyType('');
    setCustomEmergencyType('');
    setSearchQuery('');
    setLocationSuggestions([]);
    setShowLocationDropdown(false);
    setSelectedLocationId('');
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <Radio className="w-5 h-5" />
          New Emergency
        </CardTitle>
        <CardDescription>
          Received a patient call? Enter their pickup location to generate an emergency token.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!showForm ? (
          <Button
            variant="emergency"
            size="xl"
            className="w-full sm:w-auto min-w-[200px]"
            onClick={() => setShowForm(true)}
          >
            <Power className="w-5 h-5 mr-2" />
            CREATE EMERGENCY
          </Button>
        ) : (
          <div className="space-y-4">
            {/* Location Search */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-emergency flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Search Patient Location
              </label>
              <Popover open={showLocationDropdown} onOpenChange={setShowLocationDropdown}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={showLocationDropdown}
                    className="w-full justify-between border-emergency/30 text-left font-normal"
                  >
                    {pickupLocation ? (
                      <span className="truncate">{pickupLocation.address || `${pickupLocation.lat.toFixed(4)}, ${pickupLocation.lng.toFixed(4)}`}</span>
                    ) : (
                      <span className="text-muted-foreground">Search address, landmark, or area...</span>
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput
                      placeholder="Type to search locations..."
                      value={searchQuery}
                      onValueChange={setSearchQuery}
                    />
                    <CommandList>
                      <CommandEmpty>
                        {isSearching ? (
                          <div className="flex items-center justify-center py-4">
                            <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                            <span className="ml-2 text-sm">Searching...</span>
                          </div>
                        ) : searchQuery.length < 3 ? (
                          "Type at least 3 characters to search"
                        ) : (
                          "No locations found"
                        )}
                      </CommandEmpty>
                      <CommandGroup>
                        {locationSuggestions.map((suggestion) => (
                          <CommandItem
                            key={suggestion.id}
                            value={suggestion.id}
                            onSelect={() => selectLocationFromDropdown(suggestion)}
                            className="cursor-pointer"
                          >
                            <Check
                              className={`mr-2 h-4 w-4 ${
                                selectedLocationId === suggestion.id ? "opacity-100" : "opacity-0"
                              }`}
                            />
                            <div className="flex-1">
                              <div className="font-medium text-sm truncate">{suggestion.name.split(',')[0]}</div>
                              <div className="text-xs text-muted-foreground truncate">{suggestion.name}</div>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Search for an address or use map selection
                </p>
                {onEnableMapSelection && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onEnableMapSelection}
                    className="text-xs"
                  >
                    <MapPin className="w-3 h-3 mr-1" />
                    Select on Map
                  </Button>
                )}
              </div>
            </div>

            {/* Emergency Type Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-emergency flex items-center gap-2">
                <Heart className="w-4 h-4" />
                Type of Emergency *
              </label>
              <Select value={emergencyType} onValueChange={setEmergencyType}>
                <SelectTrigger className="border-emergency/30">
                  <SelectValue placeholder="Select emergency type..." />
                </SelectTrigger>
                <SelectContent>
                  {emergencyTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      <div className="flex items-center gap-2">
                        <span>{type.icon}</span>
                        <span>{type.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {emergencyType === 'custom' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-emergency">Custom Emergency Type *</label>
                  <Input
                    placeholder="Enter custom emergency type..."
                    value={customEmergencyType}
                    onChange={(e) => setCustomEmergencyType(e.target.value)}
                    className="border-emergency/30"
                  />
                </div>
              )}
              
              {emergencyType && emergencyType !== 'custom' && (
                <div className="text-xs text-muted-foreground">
                  Medical Keyword: <Badge variant="outline">{emergencyTypes.find(t => t.id === emergencyType)?.keyword}</Badge>
                </div>
              )}
              {emergencyType === 'custom' && customEmergencyType && (
                <div className="text-xs text-muted-foreground">
                  Custom Type: <Badge variant="outline">{customEmergencyType}</Badge>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleCreateToken}
                disabled={!pickupLocation || !emergencyType || (emergencyType === 'custom' && !customEmergencyType.trim()) || isCreating}
                className="flex-1"
              >
                <Ticket className="w-4 h-4 mr-2" />
                {isCreating ? 'Creating...' : 'Generate Emergency Token'}
              </Button>
              <Button variant="outline" onClick={() => { resetForm(); onCancel(); }}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};