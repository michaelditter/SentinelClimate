import React, { useState, useEffect } from 'react';
import { Truck, Building, Users, Package } from 'lucide-react';
import { ResourceDeployment } from '@/types/geo.types';

interface ResourceMarkersProps {
  deployments: ResourceDeployment[];
}

const ResourceMarkers: React.FC<ResourceMarkersProps> = ({ deployments }) => {
  const getIcon = (type: string) => {
    switch (type) {
      case 'mobile-unit': return <Truck className="h-4 w-4" />;
      case 'cooling-center': return <Building className="h-4 w-4" />;
      case 'medical-team': return <Users className="h-4 w-4" />;
      case 'emergency-kit': return <Package className="h-4 w-4" />;
      default: return <Truck className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'deployed': return 'text-green-400';
      case 'staging': return 'text-blue-400';
      case 'en-route': return 'text-orange-400';
      case 'available': return 'text-gray-400';
      default: return 'text-gray-400';
    }
  };

  const [deployment, setDeployment] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDeploymentData();
  }, []);

  const fetchDeploymentData = async () => {
    try {
      // Default to Harris County for demonstration
      const response = await fetch('/api/resource-deployment/48201');
      if (response.ok) {
        const data = await response.json();
        setDeployment(data);
      }
    } catch (error) {
      console.error('Failed to fetch deployment data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-800 p-6 rounded-lg">
        <h4 className="font-bold text-lg mb-4">Resource Deployment</h4>
        <div className="text-gray-400">Loading deployment data...</div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 p-6 rounded-lg">
      <h4 className="font-bold text-lg mb-4">Resource Deployment</h4>
      {deployment && (
        <>
          <div className="mb-3 text-xs text-gray-400">
            {deployment.county.name} - {deployment.county.isRural ? 'Rural' : 'Urban'} Response
          </div>
          <div className="mb-3 p-2 bg-gray-700 rounded text-xs">
            <div className="font-medium text-white">Status: {deployment.deployment.deploymentStatus?.toUpperCase()}</div>
            <div className="text-gray-300">{deployment.deployment.statusDescription}</div>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <Truck className="h-4 w-4 text-blue-400" />
                <span className="text-sm">Mobile Units</span>
              </div>
              <span className="font-bold text-blue-400">
                {deployment.deployment.mobileUnits} {deployment.deployment.deploymentStatus === 'standby' ? 'on standby' : 
                deployment.deployment.deploymentStatus === 'deployed' ? 'deployed' : 'available'}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <Building className="h-4 w-4 text-green-400" />
                <span className="text-sm">Emergency Shelters</span>
              </div>
              <span className="font-bold text-green-400">
                {deployment.deployment.emergencyShelters} {deployment.deployment.deploymentStatus === 'standby' ? 'ready' : 
                deployment.deployment.deploymentStatus === 'deployed' ? 'open' : 'available'}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-purple-400" />
                <span className="text-sm">Medical Personnel</span>
              </div>
              <span className="font-bold text-purple-400">
                {deployment.deployment.medicalPersonnel} {deployment.deployment.deploymentStatus === 'standby' ? 'on standby' : 
                deployment.deployment.deploymentStatus === 'deployed' ? 'deployed' : 'available'}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <Package className="h-4 w-4 text-orange-400" />
                <span className="text-sm">Emergency Kits</span>
              </div>
              <span className="font-bold text-orange-400">
                {deployment.deployment.emergencyKits} {deployment.deployment.deploymentStatus === 'standby' ? 'prepared' : 
                deployment.deployment.deploymentStatus === 'deployed' ? 'distributed' : 'available'}
              </span>
            </div>
            
            {/* Specialized Resources for Rural Areas */}
            {deployment.deployment.specializedResources && Object.keys(deployment.deployment.specializedResources).length > 0 && (
              <div className="mt-4 pt-3 border-t border-gray-700">
                <div className="text-xs text-gray-400 mb-2">Specialized Resources</div>
                <div className="space-y-2 text-xs">
                  {deployment.deployment.specializedResources.highWaterRescue && (
                    <div className="flex justify-between">
                      <span>High Water Rescue Units:</span>
                      <span className="text-yellow-400">{deployment.deployment.specializedResources.highWaterRescue}</span>
                    </div>
                  )}
                  {deployment.deployment.specializedResources.helicopterUnits && (
                    <div className="flex justify-between">
                      <span>Helicopter Units:</span>
                      <span className="text-yellow-400">{deployment.deployment.specializedResources.helicopterUnits}</span>
                    </div>
                  )}
                  {deployment.deployment.specializedResources.boatUnits && (
                    <div className="flex justify-between">
                      <span>Boat Units:</span>
                      <span className="text-yellow-400">{deployment.deployment.specializedResources.boatUnits}</span>
                    </div>
                  )}
                  {deployment.deployment.specializedResources.communicationUnits && (
                    <div className="flex justify-between">
                      <span>Communication Units:</span>
                      <span className="text-yellow-400">{deployment.deployment.specializedResources.communicationUnits}</span>
                    </div>
                  )}
                  {deployment.deployment.specializedResources.livestockSupport && (
                    <div className="text-yellow-400">✓ Livestock evacuation support</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}
      
      {/* Recent Deployments */}
      <div className="mt-6">
        <h5 className="font-medium text-sm mb-3 text-gray-400">Recent Deployments</h5>
        <div className="space-y-2">
          {deployments.slice(0, 3).map((deployment) => (
            <div key={deployment.id} className="flex items-center justify-between text-sm bg-gray-700 p-2 rounded">
              <div className="flex items-center space-x-2">
                {getIcon(deployment.type)}
                <span className="capitalize">{deployment.type.replace('-', ' ')}</span>
              </div>
              <span className={getStatusColor(deployment.status)}>
                {deployment.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ResourceMarkers;
