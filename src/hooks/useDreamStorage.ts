import { useState, useEffect, useCallback } from 'react';
import { Dream } from '../types';
import { dreamsApi } from '../services/api';

const STORAGE_KEY = 'dream-daily-data';
const API_ENABLED = import.meta.env.VITE_ENABLE_API === 'true'; // 默认关闭，用 localStorage

// LocalStorage fallback functions
function getStoredDreamsLocal(): Dream[] {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved ? JSON.parse(saved) : [];
}

function saveDreamsLocal(dreams: Dream[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(dreams));
}

export function useDreamStorage() {
  const [dreams, setDreams] = useState<Dream[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiAvailable, setApiAvailable] = useState(false);

  // Load dreams
  useEffect(() => {
    const loadDreams = async () => {
      if (API_ENABLED) {
        try {
          const apiDreams = await dreamsApi.getAll();
          setDreams(apiDreams);
          setApiAvailable(true);
          // Also sync to localStorage as backup
          saveDreamsLocal(apiDreams);
        } catch (error) {
          console.warn('API unavailable, falling back to localStorage:', error);
          setDreams(getStoredDreamsLocal());
          setApiAvailable(false);
        }
      } else {
        setDreams(getStoredDreamsLocal());
      }
      setLoading(false);
    };

    loadDreams();
  }, []);

  const saveDream = useCallback(async (dream: Dream) => {
    // First update local state for immediate UI feedback
    let newDreams: Dream[];

    if (API_ENABLED && apiAvailable) {
      try {
        const existingIndex = dreams.findIndex(d => d.id === dream.id);
        if (existingIndex >= 0) {
          await dreamsApi.update(dream);
          newDreams = [...dreams];
          newDreams[existingIndex] = dream;
        } else {
          const created = await dreamsApi.create(dream);
          newDreams = [created, ...dreams];
        }
        setDreams(newDreams);
        saveDreamsLocal(newDreams); // Sync to local
        return;
      } catch (error) {
        console.warn('API save failed, falling back to localStorage:', error);
        setApiAvailable(false);
      }
    }

    // Fallback to localStorage
    const storedDreams = getStoredDreamsLocal();
    const existingIndex = storedDreams.findIndex(d => d.id === dream.id);

    if (existingIndex >= 0) {
      newDreams = [...storedDreams];
      newDreams[existingIndex] = dream;
    } else {
      newDreams = [dream, ...storedDreams];
    }

    setDreams(newDreams);
    saveDreamsLocal(newDreams);
  }, [dreams, apiAvailable]);

  const getDream = useCallback((id: string) => {
    // 先从 state 找
    const fromState = dreams.find(d => d.id === id);
    if (fromState) return fromState;

    // state 没有的话，从 localStorage 找
    const localDreams = getStoredDreamsLocal();
    return localDreams.find(d => d.id === id);
  }, [dreams]);

  return {
    dreams,
    saveDream,
    getDream,
    loading,
    apiAvailable: API_ENABLED && apiAvailable,
  };
}
