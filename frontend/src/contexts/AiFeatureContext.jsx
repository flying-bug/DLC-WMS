import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getSystemFeatures } from '../api/backupApi';

const AiFeatureContext = createContext({
  aiEnabled: true,
  loading: false,
  setAiEnabled: () => {},
  refreshAiStatus: () => {},
});

const AI_STORAGE_KEY = 'dlc_system_ai_enabled';

export function AiFeatureProvider({ children }) {
  const [aiEnabled, setAiEnabledState] = useState(() => {
    const saved = localStorage.getItem(AI_STORAGE_KEY);
    return saved !== null ? saved === 'true' : true;
  });
  const [loading, setLoading] = useState(false);

  const setAiEnabled = useCallback((value) => {
    const boolVal = Boolean(value);
    setAiEnabledState(boolVal);
    localStorage.setItem(AI_STORAGE_KEY, String(boolVal));
    window.dispatchEvent(new CustomEvent('dlc_ai_feature_changed', { detail: { aiEnabled: boolVal } }));
  }, []);

  const refreshAiStatus = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getSystemFeatures();
      const features = res?.data || res;
      if (features && typeof features.aiEnabled === 'boolean') {
        setAiEnabled(features.aiEnabled);
      }
    } catch (err) {
      console.warn('Could not fetch AI feature flags from server, using cached/default state:', err);
    } finally {
      setLoading(false);
    }
  }, [setAiEnabled]);

  useEffect(() => {
    refreshAiStatus();

    const handleExternalChange = (e) => {
      if (e.detail && typeof e.detail.aiEnabled === 'boolean') {
        setAiEnabledState(e.detail.aiEnabled);
      }
    };

    window.addEventListener('dlc_ai_feature_changed', handleExternalChange);
    return () => window.removeEventListener('dlc_ai_feature_changed', handleExternalChange);
  }, [refreshAiStatus]);

  return (
    <AiFeatureContext.Provider value={{ aiEnabled, loading, setAiEnabled, refreshAiStatus }}>
      {children}
    </AiFeatureContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAiFeature() {
  return useContext(AiFeatureContext);
}

export default AiFeatureContext;
