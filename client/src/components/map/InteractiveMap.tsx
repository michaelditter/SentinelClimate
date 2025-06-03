import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Marker, Circle } from 'react-leaflet';
import { Icon, LatLngExpression } from 'leaflet';
import { motion, AnimatePresence } from 'framer-motion';
import { County, ResourceDeployment, HeatZone } from '@/types/geo.types';
import { resourceDeployments, heatZones } from '@/data/geoData';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in react-leaflet
delete (Icon.Default.prototype as any)._getIconUrl;
Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MapLayer {
  id: string;
  name: string;
  enabled: boolean;
  icon: string;
}

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
  const [mapLayers, setMapLayers] = useState<MapLayer[]>([
    { id: 'heat_risk', name: 'Heat Risk Index', enabled: true, icon: '🌡️' },
    { id: 'vulnerable_populations', name: 'Vulnerable Populations', enabled: true, icon: '👥' },
    { id: 'healthcare_providers', name: 'Healthcare Providers', enabled: false, icon: '🏥' },
    { id: 'active_deployments', name: 'Active Deployments', enabled: true, icon: '🚀' },
    { id: 'heat_zones', name: 'Heat Zones', enabled: true, icon: '🔥' }
  ]);

  const toggleLayer = (layerId: string) => {
    setMapLayers(prev => prev.map(layer => 
      layer.id === layerId ? { ...layer, enabled: !layer.enabled } : layer
    ));
  };

  const getCountyMarkerSize = (population: number): number => {
    if (population > 4000000) return 30;
    if (population > 2000000) return 25;
    if (population > 1000000) return 20;
    return 15;
  };

  const getRiskColor = (riskScore: number): string => {
    if (riskScore >= 90) return '#dc2626'; // red
    if (riskScore >= 70) return '#ea580c'; // orange
    if (riskScore >= 50) return '#eab308'; // yellow
    return '#16a34a'; // green
  };

  const getHeatColor = (temperature: number): string => {
    if (temperature >= 115) return '#991b1b'; // dark red
    if (temperature >= 110) return '#dc2626'; // red
    if (temperature >= 105) return '#ea580c'; // orange
    if (temperature >= 100) return '#eab308'; // yellow
    return '#16a34a'; // green
  };

  const isLayerEnabled = (layerId: string) => 
    mapLayers.find(layer => layer.id === layerId)?.enabled ?? false;

  // Center map on US with focus on heat-affected regions
  const mapCenter: LatLngExpression = [32.7767, -96.7970]; // Dallas, TX as center point
  const mapZoom = 5;

  return (
    <div className="relative w-full h-[600px] bg-gray-800 rounded-lg shadow-lg overflow-hidden">
      {/* Map Controls Panel */}
      <div className="absolute top-4 left-4 z-[1000] bg-gray-800 p-4 rounded-lg shadow-lg max-w-xs border border-gray-600">
        <h3 className="font-bold text-lg mb-3 flex items-center text-white">
          🗺️ Map Controls
        </h3>
        <div className="space-y-2">
          {mapLayers.map(layer => (
            <label key={layer.id} className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={layer.enabled}
                onChange={() => toggleLayer(layer.id)}
                className="rounded text-blue-500"
              />
              <span className="text-lg">{layer.icon}</span>
              <span className="text-sm text-gray-300">{layer.name}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Real-time Status Indicator */}
      <div className="absolute top-4 right-4 z-[1000] bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-600">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-sm text-gray-300">Live Data</span>
        </div>
      </div>

      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        className="h-full w-full"
        style={{ backgroundColor: '#1f2937' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          className="map-tiles"
        />

        {/* Heat Risk Index Layer */}
        {isLayerEnabled('heat_risk') && counties.map((county) => (
          <CircleMarker
            key={`risk-${county.id}`}
            center={county.coordinates as LatLngExpression}
            radius={getCountyMarkerSize(county.population)}
            pathOptions={{
              fillColor: getRiskColor(county.riskScore),
              color: getRiskColor(county.riskScore),
              weight: 2,
              opacity: 0.8,
              fillOpacity: 0.6
            }}
            eventHandlers={{
              click: () => onCountySelect(county)
            }}
          >
            <Popup>
              <div className="p-2 text-gray-900">
                <h4 className="font-bold">{county.name}, {county.state}</h4>
                <div className="text-sm space-y-1">
                  <div>Risk Score: {county.riskScore}/100</div>
                  <div>Temperature: {Math.round(county.temperature)}°F</div>
                  <div>Heat Index: {Math.round(county.heatIndex)}°F</div>
                  <div>Alert Level: <span className="font-bold">{county.alertLevel}</span></div>
                </div>
              </div>
            </Popup>
          </CircleMarker>
        ))}

        {/* Heat Zones Layer */}
        {isLayerEnabled('heat_zones') && heatZones.map((zone) => (
          <Circle
            key={`zone-${zone.id}`}
            center={zone.coordinates[0] as LatLngExpression}
            radius={50000 * zone.intensity}
            pathOptions={{
              fillColor: zone.riskLevel === 'EXTREME' ? '#dc2626' : 
                        zone.riskLevel === 'HIGH' ? '#ea580c' : '#eab308',
              color: 'transparent',
              fillOpacity: 0.3
            }}
          />
        ))}

        {/* Resource Deployment Layer */}
        {isLayerEnabled('active_deployments') && resourceDeployments.map((deployment) => (
          <CircleMarker
            key={`deployment-${deployment.id}`}
            center={deployment.coordinates as LatLngExpression}
            radius={8}
            pathOptions={{
              fillColor: deployment.status === 'deployed' ? '#16a34a' : 
                        deployment.status === 'en-route' ? '#eab308' : '#6b7280',
              color: '#ffffff',
              weight: 2,
              opacity: 1,
              fillOpacity: 0.8
            }}
          >
            <Popup>
              <div className="p-2 text-gray-900">
                <h4 className="font-bold capitalize">{deployment.type.replace('-', ' ')}</h4>
                <div className="text-sm space-y-1">
                  <div>Status: {deployment.status}</div>
                  <div>Capacity: {deployment.capacity}</div>
                  <div>Currently Served: {deployment.served}</div>
                </div>
              </div>
            </Popup>
          </CircleMarker>
        ))}

        {/* County Temperature Markers */}
        {counties.map((county) => (
          <Marker
            key={`temp-${county.id}`}
            position={county.coordinates as LatLngExpression}
            eventHandlers={{
              click: () => onCountySelect(county)
            }}
          >
            <Popup>
              <div className="p-3 text-gray-900">
                <h4 className="font-bold text-lg">{county.name}, {county.state}</h4>
                <div className="mt-2 space-y-2">
                  <div className={`inline-block px-2 py-1 rounded text-white text-sm font-medium ${
                    county.alertLevel === 'EXTREME' ? 'bg-red-600' :
                    county.alertLevel === 'HIGH' ? 'bg-orange-500' :
                    county.alertLevel === 'MODERATE' ? 'bg-yellow-500' : 'bg-green-500'
                  }`}>
                    {county.alertLevel} ALERT
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><strong>Temperature:</strong> {Math.round(county.temperature)}°F</div>
                    <div><strong>Heat Index:</strong> {Math.round(county.heatIndex)}°F</div>
                    <div><strong>Population:</strong> {(county.population / 1000000).toFixed(1)}M</div>
                    <div><strong>Risk Score:</strong> {county.riskScore}/100</div>
                  </div>
                  <div className="pt-2 border-t">
                    <div className="text-xs text-gray-600">
                      Vulnerable: {(county.vulnerablePopulation / 1000000).toFixed(1)}M people
                    </div>
                  </div>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-600 max-w-xs">
        <div className="text-sm font-bold text-white mb-3">Risk Levels</div>
        <div className="space-y-2 text-xs">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-red-600 rounded"></div>
            <span className="text-gray-300">EXTREME (90-100)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-orange-500 rounded"></div>
            <span className="text-gray-300">HIGH (70-89)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-yellow-500 rounded"></div>
            <span className="text-gray-300">MODERATE (50-69)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span className="text-gray-300">LOW (0-49)</span>
          </div>
        </div>
        
        <div className="mt-4 pt-3 border-t border-gray-600">
          <div className="text-sm font-bold text-white mb-2">Resources</div>
          <div className="space-y-1 text-xs">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-gray-300">Deployed</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <span className="text-gray-300">En Route</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
              <span className="text-gray-300">Available</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InteractiveMap;
