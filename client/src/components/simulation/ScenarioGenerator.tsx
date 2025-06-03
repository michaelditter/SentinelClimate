import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Settings, Play, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SimulationScenario } from '@/types/simulation.types';
import { scenarios } from '@/data/scenarioData';

interface ScenarioGeneratorProps {
  onRunSimulation: (scenario: SimulationScenario) => void;
  isRunning: boolean;
}

const ScenarioGenerator: React.FC<ScenarioGeneratorProps> = ({ onRunSimulation, isRunning }) => {
  const [selectedScenario, setSelectedScenario] = useState(scenarios[0]);
  const [customParameters, setCustomParameters] = useState({
    peakTemperature: 119,
    affectedPopulation: 181241,
    vulnerabilityFactor: 2.1,
    duration: 72
  });

  const handleParameterChange = (field: string, value: number[]) => {
    setCustomParameters(prev => ({
      ...prev,
      [field]: value[0]
    }));
  };

  const handleRunSimulation = () => {
    const scenario: SimulationScenario = {
      ...selectedScenario,
      parameters: selectedScenario.id === 'custom-scenario' ? customParameters : selectedScenario.parameters
    };
    onRunSimulation(scenario);
  };

  const resetParameters = () => {
    setCustomParameters({
      peakTemperature: 119,
      affectedPopulation: 181241,
      vulnerabilityFactor: 2.1,
      duration: 72
    });
  };

  const getScenarioColor = (scenarioId: string) => {
    if (scenarioId === selectedScenario.id) return 'bg-blue-600 border-blue-400';
    return 'bg-gray-700 hover:bg-gray-600 border-gray-600';
  };

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Settings className="h-5 w-5 mr-2" />
          Crisis Scenario Generator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Scenario Selection */}
        <div>
          <h4 className="font-medium mb-3 text-gray-300">Select Crisis Scenario</h4>
          <div className="space-y-2">
            {scenarios.map((scenario) => (
              <motion.button
                key={scenario.id}
                onClick={() => setSelectedScenario(scenario)}
                className={`w-full p-3 rounded-lg text-left border-2 transition-colors ${getScenarioColor(scenario.id)}`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="font-medium text-white">{scenario.name}</div>
                <div className="text-sm text-gray-300">{scenario.description}</div>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Parameter Controls */}
        {selectedScenario.id === 'custom-scenario' && (
          <motion.div 
            className="space-y-6"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <div className="flex justify-between items-center">
              <h4 className="font-medium text-gray-300">Custom Parameters</h4>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={resetParameters}
                className="border-gray-600 hover:bg-gray-700"
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Reset
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">
                  Peak Temperature: <span className="text-white font-bold">{customParameters.peakTemperature}°F</span>
                </label>
                <Slider
                  value={[customParameters.peakTemperature]}
                  onValueChange={(value) => handleParameterChange('peakTemperature', value)}
                  max={130}
                  min={95}
                  step={1}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">
                  Affected Population: <span className="text-white font-bold">{customParameters.affectedPopulation.toLocaleString()}</span>
                </label>
                <Slider
                  value={[customParameters.affectedPopulation]}
                  onValueChange={(value) => handleParameterChange('affectedPopulation', value)}
                  max={500000}
                  min={10000}
                  step={1000}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">
                  Vulnerability Factor: <span className="text-white font-bold">{customParameters.vulnerabilityFactor.toFixed(1)}x</span>
                </label>
                <Slider
                  value={[customParameters.vulnerabilityFactor]}
                  onValueChange={(value) => handleParameterChange('vulnerabilityFactor', value)}
                  max={3.0}
                  min={0.5}
                  step={0.1}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">
                  Duration: <span className="text-white font-bold">{customParameters.duration}h</span>
                </label>
                <Slider
                  value={[customParameters.duration]}
                  onValueChange={(value) => handleParameterChange('duration', value)}
                  max={168}
                  min={12}
                  step={6}
                  className="w-full"
                />
              </div>
            </div>
          </motion.div>
        )}

        {/* Run Simulation Button */}
        <Button 
          onClick={handleRunSimulation}
          disabled={isRunning}
          className="w-full bg-blue-600 hover:bg-blue-700 py-3"
        >
          {isRunning ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Running Simulation...</span>
            </div>
          ) : (
            <div className="flex items-center justify-center space-x-2">
              <Play className="h-4 w-4" />
              <span>Run Crisis Simulation</span>
            </div>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default ScenarioGenerator;
