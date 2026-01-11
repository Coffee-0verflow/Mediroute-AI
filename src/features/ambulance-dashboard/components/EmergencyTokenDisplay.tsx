import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Ticket, User, Building2, Play, CheckCircle, X } from 'lucide-react';
import { openGoogleMaps } from '../services/locationService';
import { Ambulance } from '../types';

interface EmergencyTokenDisplayProps {
  activeToken: any;
  ambulance: Ambulance | null;
  onStartJourney: () => void;
  onArrivedAtPatient: () => void;
  onStartToHospital: () => void;
  onCompleteEmergency: () => void;
  onCancelEmergency: () => void;
}

export const EmergencyTokenDisplay: React.FC<EmergencyTokenDisplayProps> = ({
  activeToken,
  ambulance,
  onStartJourney,
  onArrivedAtPatient,
  onStartToHospital,
  onCompleteEmergency,
  onCancelEmergency
}) => {
  const isPendingAssignment = activeToken?.status === 'pending';
  const isAccepted = activeToken?.status === 'assigned';
  const hasRouteSelected = activeToken?.status === 'route_selected';
  const isGoingToPatient = activeToken?.status === 'in_progress';
  const isAtPatient = activeToken?.status === 'at_patient';
  const isGoingToHospital = activeToken?.status === 'to_hospital';

  const showNavToPatient = activeToken?.status === 'route_selected' || activeToken?.status === 'in_progress';
  const showNavToHospital = activeToken?.status === 'at_patient' || activeToken?.status === 'to_hospital';

  return (
    <Card className="border-emergency shadow-emergency">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Ticket className="w-5 h-5 text-emergency" />
              Emergency Token: {activeToken.token_code}
            </CardTitle>
            <CardDescription>
              {isPendingAssignment && 'Waiting for hospital to assign route...'}
              {isAccepted && 'Accepted by hospital. Awaiting routes...'}
              {hasRouteSelected && 'Routes received! Ready to start journey to patient.'}
              {isGoingToPatient && '🚑 Heading to patient location...'}
              {isAtPatient && '✅ Arrived at patient location - Ready to go to hospital'}
              {isGoingToHospital && '🏥 Heading to hospital...'}
            </CardDescription>

            <div className="mt-2 flex flex-wrap gap-2">
              {isPendingAssignment && (
                <Badge variant="outline" className="animate-pulse bg-warning/15 text-warning border-warning/30">
                  ⏳ PENDING
                </Badge>
              )}
              {isAccepted && (
                <Badge variant="outline" className="bg-accent/15 text-accent border-accent/30">
                  ✓ ACCEPTED
                </Badge>
              )}
              {hasRouteSelected && (
                <Badge variant="outline" className="bg-success/15 text-success border-success/30">
                  ✓ ROUTE ASSIGNED
                </Badge>
              )}
            </div>
          </div>
          <Badge variant={isGoingToPatient || isGoingToHospital ? 'destructive' : isAtPatient ? 'default' : 'secondary'} className="text-base">
            {activeToken.status.replace(/_/g, ' ').toUpperCase()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {/* Journey Progress */}
        <div className="flex items-center gap-2 mb-4 p-3 bg-muted/50 rounded-lg">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isGoingToPatient ? 'bg-blue-500 text-white' : isAtPatient || isGoingToHospital ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'}`}>
            <User className="w-4 h-4" />
          </div>
          <div className={`flex-1 h-1 ${isAtPatient || isGoingToHospital ? 'bg-green-500' : 'bg-muted'}`} />
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isGoingToHospital ? 'bg-blue-500 text-white' : 'bg-muted text-muted-foreground'}`}>
            <Building2 className="w-4 h-4" />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div className={`p-3 rounded-lg ${isGoingToPatient ? 'bg-blue-500/10 border border-blue-500/30' : isAtPatient || isGoingToHospital ? 'bg-green-500/10 border border-green-500/30' : 'bg-muted/50'}`}>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <User className="w-4 h-4" />
              Patient Location
              {(isAtPatient || isGoingToHospital) && <Badge variant="outline" className="ml-2 text-green-600">✓ Picked Up</Badge>}
            </p>
            <p className="font-medium text-sm line-clamp-2">
              {activeToken.pickup_address || `${activeToken.pickup_lat.toFixed(4)}, ${activeToken.pickup_lng.toFixed(4)}`}
            </p>
            {activeToken.route_to_patient && (
              <div className="flex gap-2 mt-1 text-xs text-muted-foreground">
                <span>{((activeToken.route_to_patient_distance_meters || 0) / 1000).toFixed(1)} km</span>
                <span>•</span>
                <span>{Math.floor((activeToken.route_to_patient_duration_seconds || 0) / 60)} min</span>
              </div>
            )}
          </div>
          {activeToken.hospital_name && (
            <div className={`p-3 rounded-lg ${isGoingToHospital ? 'bg-blue-500/10 border border-blue-500/30' : 'bg-muted/50'}`}>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Building2 className="w-4 h-4" />
                Destination Hospital
              </p>
              <p className="font-medium">{activeToken.hospital_name}</p>
              {activeToken.route_to_hospital && (
                <div className="flex gap-2 mt-1 text-xs text-muted-foreground">
                  <span>{((activeToken.route_to_hospital_distance_meters || 0) / 1000).toFixed(1)} km</span>
                  <span>•</span>
                  <span>{Math.floor((activeToken.route_to_hospital_duration_seconds || 0) / 60)} min</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Route Navigation Buttons */}
        <div className="space-y-3 mb-4">
          {showNavToPatient && activeToken.route_to_patient && (
            <div className="p-4 rounded-xl border border-blue-500/30 bg-blue-500/10 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-blue-700">🚑 Route to Patient</p>
                  <p className="text-xs text-blue-700/70">{activeToken.pickup_address}</p>
                </div>
                <Button
                  className="bg-blue-600 hover:bg-blue-700 text-white shadow-md"
                  onClick={() => openGoogleMaps(
                    activeToken.route_to_patient,
                    { lat: ambulance?.current_lat || 0, lng: ambulance?.current_lng || 0 },
                    { lat: activeToken.pickup_lat, lng: activeToken.pickup_lng }
                  )}
                >
                  Navigate to Patient
                </Button>
              </div>
            </div>
          )}

          {showNavToHospital && activeToken.route_to_hospital && (
            <div className="p-4 rounded-xl border border-green-500/30 bg-green-500/10 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-green-700">🏥 Route to Hospital</p>
                  <p className="text-xs text-green-700/70">{activeToken.hospital_name}</p>
                </div>
                <Button
                  className="bg-green-600 hover:bg-green-700 text-white shadow-md"
                  onClick={() => openGoogleMaps(
                    activeToken.route_to_hospital,
                    { lat: activeToken.pickup_lat, lng: activeToken.pickup_lng },
                    { lat: activeToken.hospital_lat || 0, lng: activeToken.hospital_lng || 0 }
                  )}
                >
                  Navigate to Hospital
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3">
          {hasRouteSelected && (
            <Button variant="emergency" size="lg" onClick={onStartJourney} className="w-full sm:w-auto">
              <Play className="w-5 h-5 mr-2" />
              <span className="hidden sm:inline">START JOURNEY TO PATIENT</span>
              <span className="sm:hidden">START JOURNEY</span>
            </Button>
          )}
          {isGoingToPatient && (
            <Button variant="default" size="lg" onClick={onArrivedAtPatient} className="bg-green-600 hover:bg-green-700 w-full sm:w-auto">
              <CheckCircle className="w-5 h-5 mr-2" />
              <span className="hidden sm:inline">ARRIVED AT PATIENT</span>
              <span className="sm:hidden">ARRIVED</span>
            </Button>
          )}
          {isAtPatient && (
            <Button variant="emergency" size="lg" onClick={onStartToHospital} className="w-full sm:w-auto">
              <Play className="w-5 h-5 mr-2" />
              <span className="hidden sm:inline">START TO HOSPITAL</span>
              <span className="sm:hidden">TO HOSPITAL</span>
            </Button>
          )}
          {isGoingToHospital && (
            <Button variant="default" size="lg" onClick={onCompleteEmergency} className="bg-green-600 hover:bg-green-700 w-full sm:w-auto">
              <CheckCircle className="w-5 h-5 mr-2" />
              <span className="hidden sm:inline">ARRIVED AT HOSPITAL</span>
              <span className="sm:hidden">ARRIVED</span>
            </Button>
          )}
          <Button variant="outline" onClick={onCancelEmergency} className="w-full sm:w-auto">
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};