import { useCallback, useRef, useState } from 'react';

type PickerView = 'documents' | 'photos' | 'drive_photos';

export function useGooglePicker() {
  const [ready, setReady] = useState(false);
  const readyRef = useRef(false);
  const loadingRef = useRef(false);

  const load = useCallback(async () => {
    if (readyRef.current) return true;
    if (loadingRef.current) {
      while (!readyRef.current) await new Promise((r) => setTimeout(r, 100));
      return true;
    }
    loadingRef.current = true;

    const key = import.meta.env.FIREBASE_API_KEY;
    const cid = import.meta.env.FIREBASE_GOOGLE_CLIENT_ID;
    if (!key || !cid) {
      console.warn('Google Picker: missing FIREBASE_API_KEY or FIREBASE_GOOGLE_CLIENT_ID');
      loadingRef.current = false;
      return false;
    }

    await loadScript('https://apis.google.com/js/api.js');
    await new Promise<void>((resolve) => (window as any).gapi.load('picker', { callback: resolve }));
    await loadScript('https://accounts.google.com/gsi/client');

    readyRef.current = true;
    setReady(true);
    loadingRef.current = false;
    return true;
  }, []);

  const openPicker = useCallback(async (view: PickerView, onSelect: (url: string) => void) => {
    const ok = await load();
    if (!ok) return;

    const key = import.meta.env.FIREBASE_API_KEY as string;
    const cid = import.meta.env.FIREBASE_GOOGLE_CLIENT_ID as string;
    const scopes = 'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/photoslibrary.readonly';

    const token = await new Promise<string | null>((resolve) => {
      const tc = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: cid,
        scope: scopes,
        callback: (resp: any) => {
          if (resp.error) { console.error('OAuth error', resp.error); resolve(null); }
          else resolve(resp.access_token as string);
        },
      });
      tc.requestAccessToken();
    });
    if (!token) return;

    const viewId = view === 'drive_photos' ? 'drive_photos' : view;
    const picker = new (window as any).google.picker.PickerBuilder()
      .addView(new (window as any).google.picker.View(viewId))
      .setOAuthToken(token)
      .setDeveloperKey(key)
      .setCallback((data: any) => {
        if (data.action === 'picked' && data.docs?.[0]) {
          const doc = data.docs[0];
          onSelect(doc.url || `https://drive.google.com/uc?export=view&id=${doc.id}`);
        }
      })
      .build();
    picker.setVisible(true);
  }, [load]);

  return { openPicker, ready, load };
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => resolve();
    s.onerror = reject;
    document.head.appendChild(s);
  });
}
