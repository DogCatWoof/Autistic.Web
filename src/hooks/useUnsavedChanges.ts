import { useEffect } from 'react';

export function useUnsavedChanges(when: boolean) {
  useEffect(() => {
    if (!when) return;

    function handler(e: BeforeUnloadEvent) {
      e.preventDefault();
    }

    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [when]);
}
