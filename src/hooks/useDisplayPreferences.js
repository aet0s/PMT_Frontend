// client/src/hooks/useDisplayPreferences.js
import { useState, useEffect } from 'react';

const PREF_EVENT = 'taskflow:preferences-changed';

export function getStoredPreferences() {
  const density = typeof window !== 'undefined' ? (localStorage.getItem('taskflow_density') || 'detailed') : 'detailed';
  const reducedMotion = typeof window !== 'undefined' ? (localStorage.getItem('taskflow_reduced_motion') === 'true') : false;
  return {
    density,
    isCompact: density === 'compact',
    reducedMotion
  };
}

export function saveDisplayPreferences({ density, reducedMotion }) {
  if (typeof window === 'undefined') return;

  if (density !== undefined) {
    try {
      localStorage.setItem('taskflow_density', density);
      document.documentElement.classList.toggle('density-compact', density === 'compact');
    } catch (e) { }
  }

  if (reducedMotion !== undefined) {
    try {
      localStorage.setItem('taskflow_reduced_motion', String(reducedMotion));
      document.documentElement.classList.toggle('reduce-motion', Boolean(reducedMotion));
    } catch (e) { }
  }

  const current = getStoredPreferences();
  try {
    window.dispatchEvent(new CustomEvent(PREF_EVENT, { detail: current }));
  } catch (e) { }
}

export function useDisplayPreferences() {
  const [prefs, setPrefs] = useState(getStoredPreferences);

  useEffect(() => {
    const handleUpdate = () => {
      setPrefs(getStoredPreferences());
    };

    window.addEventListener(PREF_EVENT, handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener(PREF_EVENT, handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  return {
    density: prefs.density,
    isCompact: prefs.isCompact,
    reducedMotion: prefs.reducedMotion,
    setDensity: (newDensity) => saveDisplayPreferences({ density: newDensity }),
    setReducedMotion: (newMotion) => saveDisplayPreferences({ reducedMotion: newMotion })
  };
}

export default useDisplayPreferences;
