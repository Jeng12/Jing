import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock sign-in: there is no auth server, so this only remembers who is signed in on this device.

const STORAGE_KEY = 'jing.session.v1';

export interface Profile {
  name: string;
  email: string;
}

interface SessionValue {
  ready: boolean;
  signedIn: boolean;
  profile: Profile;
  signIn: (profile: Partial<Profile>) => void;
  signOut: () => void;
  updateProfile: (profile: Profile) => void;
}

const SessionContext = createContext<SessionValue | null>(null);

function nameFromEmail(email: string): string {
  const local = email.split('@')[0]?.replace(/[._-]+/g, ' ').trim();
  return local ? local.replace(/\b\w/g, c => c.toUpperCase()) : 'Friend';
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [profile, setProfile] = useState<Profile>({ name: '', email: '' });

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then(raw => {
        if (!raw) return;
        const saved = JSON.parse(raw) as { signedIn: boolean; profile: Profile };
        setSignedIn(saved.signedIn);
        setProfile(saved.profile);
      })
      .catch(() => undefined)
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (ready) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ signedIn, profile })).catch(() => undefined);
  }, [ready, signedIn, profile]);

  const signIn = useCallback((next: Partial<Profile>) => {
    setProfile(prev => {
      const email = next.email?.trim() || prev.email;
      const name = next.name?.trim() || prev.name || nameFromEmail(email);
      return { name, email };
    });
    setSignedIn(true);
  }, []);

  const signOut = useCallback(() => setSignedIn(false), []);
  const updateProfile = useCallback((next: Profile) => setProfile(next), []);

  const value = useMemo(
    () => ({ ready, signedIn, profile, signIn, signOut, updateProfile }),
    [ready, signedIn, profile, signIn, signOut, updateProfile],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside SessionProvider');
  return ctx;
}
