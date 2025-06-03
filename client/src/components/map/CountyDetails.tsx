import React from 'react';
import { Users, Home, Heart, Building } from 'lucide-react';
import { County } from '@/types/geo.types';

interface CountyDetailsProps {
  county: County | null;
}

const CountyDetails: React.FC<CountyDetailsProps> = ({ county }) => {
  if (!county) {
    return (
      <div className="bg-gray-800 p-6 rounded-lg">
        <h4 className="font-bold text-lg mb-4">County Risk Analysis</h4>
        <div className="text-center text-gray-400">
          Select a county on the map to view detailed analysis
        </div>
      </div>
    );
  }

  const vulnerabilityPercentage = (county.vulnerablePopulation / county.population) * 100;

  return (
    <div className="bg-gray-800 p-6 rounded-lg">
      <h4 className="font-bold text-lg mb-4">County Risk Analysis</h4>
      
      <div className={`bg-gray-700 p-4 rounded-lg border-l-4 ${
        county.alertLevel === 'EXTREME' ? 'border-red-400' :
        county.alertLevel === 'HIGH' ? 'border-orange-400' :
        county.alertLevel === 'MODERATE' ? 'border-yellow-400' : 'border-green-400'
      }`}>
        <div className={`font-bold ${
          county.alertLevel === 'EXTREME' ? 'text-red-400' :
          county.alertLevel === 'HIGH' ? 'text-orange-400' :
          county.alertLevel === 'MODERATE' ? 'text-yellow-400' : 'text-green-400'
        }`}>
          {county.name}, {county.state}
        </div>
        <div className="text-sm text-gray-400 mb-3">
          Population: {(county.population / 1000000).toFixed(1)}M | Vulnerable: {vulnerabilityPercentage.toFixed(0)}%
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center space-x-2 text-sm">
            <Home className="h-4 w-4 text-blue-400" />
            <div>
              <div className="text-gray-300">No AC: {(county.demographics.noAC / 1000).toFixed(0)}K homes</div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 text-sm">
            <Building className="h-4 w-4 text-purple-400" />
            <div>
              <div className="text-gray-300">Provider shortage: {county.demographics.providerShortage}%</div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 text-sm">
            <Heart className="h-4 w-4 text-red-400" />
            <div>
              <div className="text-gray-300">Elderly: {county.demographics.elderly}%</div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 text-sm">
            <Users className="h-4 w-4 text-green-400" />
            <div>
              <div className="text-gray-300">Low income: {county.demographics.lowIncome}%</div>
            </div>
          </div>
        </div>
        
        <div className="mt-4">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-400">Risk Score</span>
            <span className="font-bold">{county.riskScore}/100</span>
          </div>
          <div className="w-full bg-gray-600 rounded-full h-2">
            <div 
              className={`h-2 rounded-full ${
                county.riskScore >= 90 ? 'bg-red-500' :
                county.riskScore >= 70 ? 'bg-orange-500' :
                county.riskScore >= 50 ? 'bg-yellow-500' : 'bg-green-500'
              }`}
              style={{ width: `${county.riskScore}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CountyDetails;
