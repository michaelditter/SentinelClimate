import { useState, useCallback } from 'react';
import { SimulationScenario, SimulationResult } from '@/types/simulation.types';
import { generateSimulationResult } from '@/data/scenarioData';

export const useSimulation = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [currentResult, setCurrentResult] = useState<SimulationResult | null>(null);
  const [history, setHistory] = useState<SimulationResult[]>([]);

  const runSimulation = useCallback(async (scenario: SimulationScenario): Promise<SimulationResult> => {
    setIsRunning(true);
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const result = generateSimulationResult(scenario);
    
    setCurrentResult(result);
    setHistory(prev => [result, ...prev.slice(0, 9)]); // Keep last 10 results
    setIsRunning(false);
    
    return result;
  }, []);

  const clearResults = useCallback(() => {
    setCurrentResult(null);
    setHistory([]);
  }, []);

  return {
    isRunning,
    currentResult,
    history,
    runSimulation,
    clearResults
  };
};
