import { useState, useEffect, useCallback } from 'react';

interface RealTimeData {
  timestamp: Date;
  temperature: Record<string, number>;
  alerts: any[];
  agentStatus: Record<string, any>;
  kpiData: {
    livesSaved: number;
    savingsThisMonth: number;
    systemsProtected: number;
    avgResponseTime: number;
  };
}

export const useRealTimeData = (isActive: boolean = true) => {
  const [data, setData] = useState<RealTimeData>({
    timestamp: new Date(),
    temperature: {
      'harris-tx': 119,
      'maricopa-az': 115,
      'miami-dade-fl': 108
    },
    alerts: [],
    agentStatus: {},
    kpiData: {
      livesSaved: 12,
      savingsThisMonth: 47.2,
      systemsProtected: 156,
      avgResponseTime: 2.3
    }
  });
  
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'error'>('connected');

  const updateData = useCallback(() => {
    setData(prev => ({
      ...prev,
      timestamp: new Date(),
      temperature: {
        ...prev.temperature,
        'harris-tx': prev.temperature['harris-tx'] + (Math.random() - 0.5) * 2,
        'maricopa-az': prev.temperature['maricopa-az'] + (Math.random() - 0.5) * 1.5,
        'miami-dade-fl': prev.temperature['miami-dade-fl'] + (Math.random() - 0.5) * 1
      },
      kpiData: {
        livesSaved: prev.kpiData.livesSaved + (Math.random() > 0.95 ? 1 : 0),
        savingsThisMonth: prev.kpiData.savingsThisMonth + Math.random() * 0.1,
        systemsProtected: prev.kpiData.systemsProtected + (Math.random() > 0.98 ? 1 : 0),
        avgResponseTime: Math.max(1.5, prev.kpiData.avgResponseTime + (Math.random() - 0.5) * 0.1)
      }
    }));
  }, []);

  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(updateData, 2000);
    return () => clearInterval(interval);
  }, [isActive, updateData]);

  return { data, connectionStatus, updateData };
};
