import React from 'react';
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

  return (
    <div className="bg-gray-800 p-6 rounded-lg">
      <h4 className="font-bold text-lg mb-4">Resource Deployment</h4>
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Truck className="h-4 w-4 text-blue-400" />
            <span className="text-sm">Mobile Units</span>
          </div>
          <span className="font-bold text-blue-400">47 active</span>
        </div>
        
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Building className="h-4 w-4 text-green-400" />
            <span className="text-sm">Cooling Centers</span>
          </div>
          <span className="font-bold text-green-400">23 open</span>
        </div>
        
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Users className="h-4 w-4 text-purple-400" />
            <span className="text-sm">Medical Teams</span>
          </div>
          <span className="font-bold text-purple-400">15 deployed</span>
        </div>
        
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Package className="h-4 w-4 text-orange-400" />
            <span className="text-sm">Emergency Kits</span>
          </div>
          <span className="font-bold text-orange-400">2.1K distributed</span>
        </div>
      </div>
      
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
