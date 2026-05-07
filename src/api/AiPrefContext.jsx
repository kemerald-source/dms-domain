import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';

const AiPrefContext = createContext(null);

export function AiPrefProvider({ children }) {
  const { user } = useAuth();
  const email = user?.email || null;
  const [aiEnabled, setAiEnabledState] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!email) {
      setAiEnabledState(true);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch('/.netlify/functions/user-prefs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, action: 'get' }),
    })
      .then(r => r.ok ? r.json() : Promise.reject(r))
      .then(data => { if (!cancelled) setAiEnabledState(data.aiEnabled !== false); })
      .catch(() => { if (!cancelled) setAiEnabledState(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [email]);

  const setAiEnabled = useCallback(async (next) => {
    if (!email) return;
    const prev = aiEnabled;
    setAiEnabledState(next);
    try {
      const res = await fetch('/.netlify/functions/user-prefs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, action: 'set', aiEnabled: next }),
      });
      if (!res.ok) throw new Error('save failed');
    } catch {
      setAiEnabledState(prev);
    }
  }, [email, aiEnabled]);

  return (
    <AiPrefContext.Provider value={{ aiEnabled, setAiEnabled, loading }}>
      {children}
    </AiPrefContext.Provider>
  );
}

export function useAiPref() {
  const ctx = useContext(AiPrefContext);
  if (!ctx) throw new Error('useAiPref must be used within an AiPrefProvider');
  return ctx;
}
