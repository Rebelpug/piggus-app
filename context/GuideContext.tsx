import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Guide } from '@/client/piggusApi';
import { apiFetchGuides, apiFetchGuide } from '@/services';

interface GuideContextType {
  guides: Guide[];
  loading: boolean;
  error: string | null;
  refreshGuides: () => Promise<void>;
  getGuideById: (id: string) => Guide | undefined;
  fetchGuideById: (id: string) => Promise<Guide>;
}

const GuideContext = createContext<GuideContextType | undefined>(undefined);

interface GuideProviderProps {
  children: ReactNode;
}

export const GuideProvider: React.FC<GuideProviderProps> = ({ children }) => {
  const [guides, setGuides] = useState<Guide[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshGuides = async () => {
    try {
      setLoading(true);
      setError(null);
      const fetchedGuides = await apiFetchGuides();
      setGuides(fetchedGuides);
    } catch (err) {
      console.error('Failed to fetch guides:', err);
      setError('Failed to load guides');
    } finally {
      setLoading(false);
    }
  };

  const getGuideById = (id: string): Guide | undefined => {
    return guides.find(guide => guide.id === id);
  };

  const fetchGuideById = async (id: string): Promise<Guide> => {
    try {
      const guide = await apiFetchGuide(id);
      // Update the guides array with the fetched guide if it's not already there or if it needs updating
      setGuides(prevGuides => {
        const existingIndex = prevGuides.findIndex(g => g.id === id);
        if (existingIndex >= 0) {
          const newGuides = [...prevGuides];
          newGuides[existingIndex] = guide;
          return newGuides;
        } else {
          return [...prevGuides, guide];
        }
      });
      return guide;
    } catch (err) {
      console.error(`Failed to fetch guide ${id}:`, err);
      throw err;
    }
  };

  useEffect(() => {
    refreshGuides();
  }, []);

  const value: GuideContextType = {
    guides,
    loading,
    error,
    refreshGuides,
    getGuideById,
    fetchGuideById,
  };

  return (
    <GuideContext.Provider value={value}>
      {children}
    </GuideContext.Provider>
  );
};

export const useGuides = (): GuideContextType => {
  const context = useContext(GuideContext);
  if (context === undefined) {
    throw new Error('useGuides must be used within a GuideProvider');
  }
  return context;
};