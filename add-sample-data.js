import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cvxskekpgdiycsrlniic.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2eHNrZWtwZ2RpeWNzcmxuaWljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY1MTM0ODQsImV4cCI6MjA4MjA4OTQ4NH0.w4XtKxMGoO6pVReODam2W8Y0edS4KGCn4ycNHQ63wwA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function addDriversAndAmbulances() {
  // Sample drivers data
  const drivers = [
    { email: 'driver1@mediroute.com', password: 'driver123', full_name: 'John Smith', role: 'ambulance_driver' },
    { email: 'driver2@mediroute.com', password: 'driver123', full_name: 'Sarah Johnson', role: 'ambulance_driver' },
    { email: 'driver3@mediroute.com', password: 'driver123', full_name: 'Mike Davis', role: 'ambulance_driver' },
    { email: 'driver4@mediroute.com', password: 'driver123', full_name: 'Lisa Wilson', role: 'ambulance_driver' },
    { email: 'driver5@mediroute.com', password: 'driver123', full_name: 'Tom Brown', role: 'ambulance_driver' }
  ];

  // Sample ambulances data
  const ambulances = [
    { license_plate: 'AMB-001', vehicle_type: 'Type A', equipment_level: 'BLS', status: 'available' },
    { license_plate: 'AMB-002', vehicle_type: 'Type B', equipment_level: 'ALS', status: 'available' },
    { license_plate: 'AMB-003', vehicle_type: 'Type A', equipment_level: 'BLS', status: 'available' },
    { license_plate: 'AMB-004', vehicle_type: 'Type B', equipment_level: 'ALS', status: 'available' },
    { license_plate: 'AMB-005', vehicle_type: 'Type A', equipment_level: 'BLS', status: 'available' }
  ];

  try {
    // Create auth users and profiles
    for (let i = 0; i < drivers.length; i++) {
      const driver = drivers[i];
      
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: driver.email,
        password: driver.password,
        email_confirm: true
      });

      if (authError) {
        console.error(`Error creating driver ${i + 1}:`, authError);
        continue;
      }

      // Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          full_name: driver.full_name,
          role: driver.role
        });

      if (profileError) {
        console.error(`Error creating profile for driver ${i + 1}:`, profileError);
        continue;
      }

      // Create ambulance
      const { error: ambulanceError } = await supabase
        .from('ambulances')
        .insert({
          ...ambulances[i],
          driver_id: authData.user.id,
          current_location: `POINT(${-74.006 + Math.random() * 0.1} ${40.7128 + Math.random() * 0.1})`
        });

      if (ambulanceError) {
        console.error(`Error creating ambulance ${i + 1}:`, ambulanceError);
      } else {
        console.log(`✅ Created driver ${driver.full_name} with ambulance ${ambulances[i].license_plate}`);
      }
    }

    console.log('🎉 All drivers and ambulances created successfully!');
  } catch (error) {
    console.error('Error:', error);
  }
}

addDriversAndAmbulances();