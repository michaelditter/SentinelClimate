import React from 'react';
import { MapPin, AlertTriangle } from 'lucide-react';
import { County } from '@/types/geo.types';

interface InteractiveMapProps {
  counties: County[];
  selectedCounty: County | null;
  onCountySelect: (county: County) => void;
}

const InteractiveMap: React.FC<InteractiveMapProps> = ({
  counties,
  selectedCounty,
  onCountySelect
}) => {
  const getAlertColor = (level: string) => {
    switch (level) {
      case 'EXTREME': return 'bg-red-600 border-red-400';
      case 'HIGH': return 'bg-orange-500 border-orange-400';
      case 'MODERATE': return 'bg-yellow-500 border-yellow-400';
      default: return 'bg-green-500 border-green-400';
    }
  };

  return (
    <div className="h-96 bg-gray-700 rounded-lg relative overflow-hidden">
      {/* Map Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900" />
      
      {/* County Markers */}
      {counties.map((county) => (
        <div
          key={county.id}
          className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-300 hover:scale-110 ${
            selectedCounty?.id === county.id ? 'z-20 scale-125' : 'z-10'
          }`}
          style={{
            left: `${((county.coordinates[1] + 180) / 360) * 100}%`,
            top: `${((90 - county.coordinates[0]) / 180) * 100}%`
          }}
          onClick={() => onCountySelect(county)}
        >
          <div className={`p-3 rounded-lg border-2 ${getAlertColor(county.alertLevel)} shadow-lg`}>
            <div className="flex items-center space-x-2">
              <MapPin className="h-4 w-4 text-white" />
              <div className="text-white">
                <div className="font-bold text-sm">{county.name}</div>
                <div className="text-xs">{Math.round(county.temperature)}°F</div>
              </div>
            </div>
          </div>
          
          {/* Risk indicator */}
          {county.alertLevel === 'EXTREME' && (
            <div className="absolute -top-2 -right-2 animate-pulse">
              <AlertTriangle className="h-6 w-6 text-red-400" />
            </div>
          )}
        </div>
      ))}
      
      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-gray-800 p-3 rounded-lg border border-gray-600">
        <div className="text-sm font-bold text-white mb-2">Risk Levels</div>
        <div className="space-y-1 text-xs">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-600 rounded"></div>
            <span className="text-gray-300">EXTREME</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-orange-500 rounded"></div>
            <span className="text-gray-300">HIGH</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-yellow-500 rounded"></div>
            <span className="text-gray-300">MODERATE</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InteractiveMap;
