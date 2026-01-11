import React from 'react';
import { Button } from '@/components/ui/button';
import { Bell, X } from 'lucide-react';

interface EmergencyBroadcastAlertProps {
  message: string;
  onClose: () => void;
}

export const EmergencyBroadcastAlert: React.FC<EmergencyBroadcastAlertProps> = ({
  message,
  onClose
}) => {
  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 max-w-md w-full mx-4">
      <div className="bg-red-600 border border-red-500 rounded-lg p-4 shadow-lg animate-pulse">
        <div className="flex items-start gap-3">
          <Bell className="w-6 h-6 text-white flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-bold text-white text-sm">🚨 EMERGENCY BROADCAST</h3>
            <p className="text-white text-sm mt-1">{message}</p>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={onClose}
            className="text-white hover:bg-red-700 p-1 h-auto"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};