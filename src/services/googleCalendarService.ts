import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User, signOut } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { CalendarEvent } from '../types';

// Initialize Firebase only if it hasn't been initialized already
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
// Request Google Calendar scopes
provider.addScope('https://www.googleapis.com/auth/calendar');
provider.addScope('https://www.googleapis.com/auth/calendar.events');

let isSigningIn = false;
let cachedAccessToken: string | null = null;

// Load cached token from memory
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else {
        // If we don't have the cached token, we can trigger re-login or ask user
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get access token from Google Auth');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const setAccessToken = (token: string | null) => {
  cachedAccessToken = token;
};

export const logoutGoogle = async () => {
  try {
    await signOut(auth);
  } catch (err) {
    console.warn('Sign out notice:', err);
  } finally {
    cachedAccessToken = null;
  }
};

// Helper to parse dates and times
export function parseDateAndTime(dateStr: string, timeStr: string): Date {
  const baseDate = new Date(dateStr);
  let hours = 9;
  let minutes = 0;
  
  const timeClean = timeStr.trim().toUpperCase();
  const is12Hour = timeClean.includes('AM') || timeClean.includes('PM');
  
  if (is12Hour) {
    const match = timeClean.match(/(\d+):(\d+)\s*(AM|PM)/);
    if (match) {
      hours = parseInt(match[1], 10);
      minutes = parseInt(match[2], 10);
      const meridian = match[3];
      if (meridian === 'PM' && hours < 12) {
        hours += 12;
      } else if (meridian === 'AM' && hours === 12) {
        hours = 0;
      }
    }
  } else {
    const parts = timeClean.split(':');
    if (parts.length >= 2) {
      hours = parseInt(parts[0], 10);
      minutes = parseInt(parts[1], 10);
    }
  }
  
  const result = new Date(baseDate);
  result.setHours(hours, minutes, 0, 0);
  return result;
}

// Fetch Google Calendar events
export const fetchGoogleEvents = async (accessToken: string, timeMin?: string): Promise<any[]> => {
  if (!accessToken) {
    return [];
  }
  try {
    const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
    url.searchParams.append('singleEvents', 'true');
    url.searchParams.append('orderBy', 'startTime');
    if (timeMin) {
      url.searchParams.append('timeMin', timeMin);
    } else {
      // Default to last 30 days
      const past = new Date();
      past.setDate(past.getDate() - 30);
      url.searchParams.append('timeMin', past.toISOString());
    }

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      if (res.status === 401) {
        cachedAccessToken = null;
      }
      return [];
    }

    const data = await res.json();
    return data.items || [];
  } catch (err) {
    console.warn('Network notice: Google Calendar API unreachable, using local event storage.');
    return [];
  }
};

// Create an event on Google Calendar
export const createGoogleEvent = async (accessToken: string, event: Omit<CalendarEvent, 'id'>): Promise<string> => {
  const start = parseDateAndTime(event.date, event.time);
  const end = new Date(start.getTime() + 60 * 60 * 1000); // 1 hour duration default

  if (!accessToken) {
    return 'local_g_event_' + Math.random().toString(36).substring(2, 9);
  }

  try {
    const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        summary: event.title,
        description: `${event.description}\n\n[VitalSync Type: ${event.type}]`,
        start: {
          dateTime: start.toISOString(),
        },
        end: {
          dateTime: end.toISOString(),
        },
      }),
    });

    if (!res.ok) {
      if (res.status === 401) {
        cachedAccessToken = null;
      }
      return 'local_g_event_' + Math.random().toString(36).substring(2, 9);
    }

    const data = await res.json();
    return data.id; // Returns Google's event ID
  } catch (err) {
    console.warn('Network notice: Saved event locally in RLT 1.0 calendar.');
    return 'local_g_event_' + Math.random().toString(36).substring(2, 9);
  }
};

// Delete an event on Google Calendar
export const deleteGoogleEvent = async (accessToken: string, googleEventId: string): Promise<void> => {
  if (!accessToken || googleEventId.startsWith('local_g_event_')) {
    return;
  }
  try {
    const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${googleEventId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok && res.status !== 404) {
      if (res.status === 401) {
        cachedAccessToken = null;
      }
    }
  } catch (err) {
    console.warn('Network notice: Removed event from local RLT 1.0 calendar.');
  }
};
