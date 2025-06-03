import { useState, useEffect, useCallback } from 'react';
import { dataIntegrationService, RealTimeSystemData } from '@/services/dataIntegrationService';

export const useRealTimeData = (isActive: boolean = true) => {
  const [data, setData] = useState<RealTimeSystemData | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'error'>('connected');

  useEffect(() => {
    if (!isActive) return;

    let unsubscribe: (() => void) | null = null;

    const initializeData = async () => {
      try {
        setConnectionStatus('connected');
        
        // Start real-time updates
        await dataIntegrationService.startRealTimeUpdates();
        
        // Subscribe to data updates
        unsubscribe = dataIntegrationService.subscribe((newData) => {
          setData(newData);
        });
        
      } catch (error) {
        console.error('Real-time data initialization failed:', error);
        setConnectionStatus('error');
      }
    };

    initializeData();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
      dataIntegrationService.stopRealTimeUpdates();
    };
  }, [isActive]);

  const updateData = useCallback(() => {
    // Data updates are handled by the integration service
    const currentData = dataIntegrationService.getCurrentData();
    if (currentData) {
      setData(currentData);
    }
  }, []);

  return { 
    data: data || {
      timestamp: new Date(),
      weather: {},
      health: {},
      powerGrid: {
        systemLoad: 45000,
        totalCapacity: 85000,
        reserveMargin: 25.5,
        demandForecast: 52000,
        outageCapacity: 2100,
        renewableGeneration: { wind: 8500, solar: 2800, total: 11300 },
        gridStability: 'Normal' as const,
        emergencyLevel: 1
      },
      alerts: [],
      kpiData: {
        livesSaved: 12,
        savingsThisMonth: 47.2,
        systemsProtected: 156,
        avgResponseTime: 2.3
      },
      agentStatus: {}
    }, 
    connectionStatus, 
    updateData 
  };
};
