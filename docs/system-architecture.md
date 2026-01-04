# System Architecture

```mermaid
graph LR
    CityAdmin -->|Register Ambulance| AdminServer
    AdminServer -->|Issue Digital ID| Ambulance
    AdminServer -->|Verify Hospital| MediRouteAI
    Ambulance -->|Position Updates| MediRouteAI
    Hospital -->|Route Approval| MediRouteAI
    Hospital -->|Live Tracking| MediRouteAI
    Hospital -->|Create Emergency| MediRouteAI
    MediRouteAI -->|Route Calculation| MapEngine
    MediRouteAI -->|Fastest Route| MapEngine
    MediRouteAI -->|Activate Corridor| TrafficControl
    TrafficControl -->|Signal Control| TrafficSignals
```

## Components

- **CityAdmin**: Manages ambulance registration and fleet oversight
- **AdminServer**: Handles authentication and verification processes
- **Ambulance**: Real-time GPS tracking and emergency response
- **Hospital**: Emergency management and route coordination
- **MediRouteAI**: Core system for route optimization and traffic control
- **MapEngine**: Route calculation and navigation services
- **TrafficControl**: Automated traffic signal management
- **TrafficSignals**: Physical traffic infrastructure integration