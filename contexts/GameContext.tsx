import React, { createContext, useContext, useState, useCallback } from 'react';

interface GameContextType {
  isGameInProgress: boolean;
  setGameInProgress: (inProgress: boolean) => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isGameInProgress, setIsGameInProgress] = useState(false);

  const setGameInProgress = useCallback((inProgress: boolean) => {
    setIsGameInProgress(inProgress);
  }, []);

  return (
    <GameContext.Provider value={{ isGameInProgress, setGameInProgress }}>
      {children}
    </GameContext.Provider>
  );
};

export const useGameContext = () => {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGameContext must be used within a GameProvider');
  }
  return context;
};
