import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { inboxApi } from '@/api/inbox';
import { userSocketUrl } from '@/api/realtime';
import { tokenStore } from '@/lib/storage';
import { useAuth } from '@/store/auth';
import { InAppBanner } from '@/components/InAppBanner';

/**
 * The deep-link object the server nests inside a notification. Keys mirror what
 * notifications.tsx open() reads, so the banner can reuse the same routing.
 */
export interface RealtimeDeepLink {
  screen?: string;
  conversation_id?: string;
  meeting_id?: string;
  tab?: string;
  [key: string]: unknown;
}

/** One global-socket frame: { type:'notification', payload:{...} }. */
export interface RealtimeNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  payload: RealtimeDeepLink | null;
  created_at: string;
}

/** What the user is currently looking at, so we can suppress a redundant banner. */
export type ActiveContext = { kind: 'chat' | 'meeting' | 'support'; id?: string } | null;

interface RealtimeContextValue {
  unreadCount: number;
  /** Bumps on every incoming notification so screens can refetch. */
  revision: number;
  refreshUnread: () => void;
  setActiveContext: (ctx: ActiveContext) => void;
  emitBanner: (notif: RealtimeNotification) => void;
}

const RealtimeContext = createContext<RealtimeContextValue | undefined>(undefined);

const MAX_BACKOFF_MS = 15000;

/** Does an incoming notification target the screen the user is already viewing? */
function matchesActiveContext(ctx: ActiveContext, link: RealtimeDeepLink | null): boolean {
  if (!ctx || !link) return false;
  if (ctx.kind === 'support') {
    // The support thread has no id; treat any support-screen link as a match.
    return link.screen === 'support';
  }
  if (ctx.kind === 'chat') {
    return !!link.conversation_id && String(link.conversation_id) === String(ctx.id);
  }
  if (ctx.kind === 'meeting') {
    return !!link.meeting_id && String(link.meeting_id) === String(ctx.id);
  }
  return false;
}

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const { status, userId } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [revision, setRevision] = useState(0);
  const [banner, setBanner] = useState<RealtimeNotification | null>(null);

  // Refs so the long-lived socket callbacks always read fresh values without
  // forcing the connect effect to re-run.
  const activeContextRef = useRef<ActiveContext>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const backoffRef = useRef(1000);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closedRef = useRef(false); // true once we have intentionally torn down

  const refreshUnread = useCallback(() => {
    inboxApi
      .unread()
      .then((r) => setUnreadCount(r.count))
      .catch(() => {});
  }, []);

  const setActiveContext = useCallback((ctx: ActiveContext) => {
    activeContextRef.current = ctx;
  }, []);

  const emitBanner = useCallback((notif: RealtimeNotification) => {
    setBanner(notif);
  }, []);

  // ── Single global socket, opened only while signed in ────────────────────
  useEffect(() => {
    if (status !== 'signedIn') return;

    closedRef.current = false;
    let cancelled = false;

    const clearReconnect = () => {
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }
    };

    const scheduleReconnect = () => {
      if (cancelled || closedRef.current) return;
      clearReconnect();
      const delay = backoffRef.current;
      backoffRef.current = Math.min(backoffRef.current * 2, MAX_BACKOFF_MS);
      reconnectTimer.current = setTimeout(() => {
        connect();
      }, delay);
    };

    const handleNotification = (notif: RealtimeNotification) => {
      // Each frame: bump revision (screens refetch), refresh the unread badge,
      // and surface a banner unless the user is already on that screen.
      setRevision((r) => r + 1);
      refreshUnread();
      if (!matchesActiveContext(activeContextRef.current, notif.payload)) {
        setBanner(notif);
      }
    };

    const connect = async () => {
      if (cancelled || closedRef.current) return;
      let token: string | null = null;
      try {
        token = await tokenStore.getAccess();
      } catch {
        token = null;
      }
      if (!token || cancelled || closedRef.current) {
        if (!token) scheduleReconnect();
        return;
      }

      let ws: WebSocket;
      try {
        ws = new WebSocket(userSocketUrl(token));
      } catch {
        scheduleReconnect();
        return;
      }
      wsRef.current = ws;

      ws.onopen = () => {
        backoffRef.current = 1000; // healthy connection - reset backoff
      };
      ws.onmessage = (ev) => {
        try {
          const frame = JSON.parse(ev.data);
          if (frame?.type === 'notification' && frame.payload) {
            handleNotification(frame.payload as RealtimeNotification);
          }
        } catch {
          /* ignore malformed frames */
        }
      };
      ws.onerror = () => {
        // onclose follows; reconnect is scheduled there.
      };
      ws.onclose = () => {
        if (wsRef.current === ws) wsRef.current = null;
        scheduleReconnect();
      };
    };

    // Reconnect promptly when the app returns to the foreground.
    const onAppState = (next: AppStateStatus) => {
      if (next === 'active') {
        const ws = wsRef.current;
        const live = ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING);
        if (!live) {
          backoffRef.current = 1000;
          clearReconnect();
          connect();
        }
        refreshUnread();
      }
    };
    const sub = AppState.addEventListener('change', onAppState);

    // Prime the badge + open the socket.
    refreshUnread();
    connect();

    return () => {
      cancelled = true;
      closedRef.current = true;
      clearReconnect();
      sub.remove();
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [status, userId, refreshUnread]);

  // Reset the badge when signed out.
  useEffect(() => {
    if (status === 'signedOut') setUnreadCount(0);
  }, [status]);

  const value = useMemo(
    () => ({ unreadCount, revision, refreshUnread, setActiveContext, emitBanner }),
    [unreadCount, revision, refreshUnread, setActiveContext, emitBanner]
  );

  return (
    <RealtimeContext.Provider value={value}>
      {children}
      <InAppBanner notif={banner} onDismiss={() => setBanner(null)} />
    </RealtimeContext.Provider>
  );
}

export function useRealtime() {
  const ctx = useContext(RealtimeContext);
  if (!ctx) throw new Error('useRealtime must be used within RealtimeProvider');
  return ctx;
}
