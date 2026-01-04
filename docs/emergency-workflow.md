# Emergency Workflow

```mermaid
graph TD
    Patient -->|Start Emergency| Hospital
    Patient -->|Call| Hospital
    Hospital -->|Assign Nearest Ambulance| Hospital
    Hospital -->|Emergency Completed| Hospital
    Hospital -->|Send Verified Request to MediRoute AI| RouteCalc[Route Calculation]
    Patient -->|Direct Call| RouteCalc
    RouteCalc --> GreenCorridor[Activate Green Corridor]
    GreenCorridor --> TrafficSignals[Traffic Signals Turn Green]
    TrafficSignals --> AmbulanceMove[Ambulance Moves]
    AmbulanceMove --> LiveTracking[Live Tracking]
    LiveTracking --> Patient
    LiveTracking --> Hospital
```

## Workflow Steps

1. **Emergency Initiation**: Patient calls hospital or directly contacts emergency services
2. **Hospital Response**: Hospital verifies emergency and assigns nearest available ambulance
3. **Route Calculation**: MediRoute AI calculates optimal route considering traffic conditions
4. **Green Corridor Activation**: System automatically activates traffic signal priority
5. **Traffic Control**: All signals along the route turn green for ambulance passage
6. **Live Tracking**: Real-time GPS tracking provides updates to hospital and patient
7. **Emergency Completion**: System confirms ambulance arrival and resets traffic signals