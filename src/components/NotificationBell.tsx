'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell, BellOff, Check, X, ShieldAlert, Sparkles, CreditCard, Stethoscope } from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import { getNotifications, markNotificationsAsRead } from '@/lib/db';

interface NotificationItem {
  id: string;
  user_id: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

export default function NotificationBell() {
  const { data: session } = authClient.useSession();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const userId = session?.user?.id;

  const fetchNotifications = async () => {
    if (!userId) return;
    try {
      const data = await getNotifications(userId);
      setNotifications(data as NotificationItem[]);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchNotifications();
      // Poll notifications every 30 seconds for live updates
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [userId]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleMarkAllAsRead = async () => {
    if (!userId) return;
    try {
      await markNotificationsAsRead(userId);
      await fetchNotifications();
    } catch (err) {
      console.error('Error marking notifications as read:', err);
    }
  };

  const getNotificationIcon = (title: string) => {
    const t = title.toLowerCase();
    if (t.includes('apto') || t.includes('médico')) {
      return <Stethoscope className="w-4 h-4 text-purple-500" />;
    }
    if (t.includes('pago') || t.includes('comprobante')) {
      return <CreditCard className="w-4 h-4 text-emerald-500" />;
    }
    if (t.includes('solicitud') || t.includes('aprobada')) {
      return <Sparkles className="w-4 h-4 text-amber-500" />;
    }
    return <ShieldAlert className="w-4 h-4 text-blue-500" />;
  };

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={handleToggle}
        className="relative p-2.5 bg-card hover:bg-muted text-foreground border border-border rounded-xl transition-all duration-200 cursor-pointer shadow-sm hover:scale-[1.05] active:scale-[0.95] flex items-center justify-center"
        title="Notificaciones"
      >
        <Bell className={`w-5 h-5 ${unreadCount > 0 ? 'animate-bounce' : ''}`} />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-rose-600 text-[10px] font-black text-white shadow-md animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2.5 w-80 sm:w-96 bg-card border border-border rounded-2xl shadow-xl z-[9999] overflow-hidden animate-in fade-in slide-in-from-top-3 duration-200">
          {/* Header */}
          <div className="px-4 py-3 border-b border-border bg-muted/20 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-foreground text-sm">Notificaciones</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 bg-rose-600/10 text-rose-600 dark:text-rose-400 text-[10px] font-black rounded-full">
                  {unreadCount} nuevas
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-xs text-primary hover:text-primary/80 font-bold flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
                Marcar todo leído
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-72 overflow-y-auto divide-y divide-border">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-muted-foreground flex flex-col items-center gap-2">
                <BellOff className="w-8 h-8 text-muted-foreground/45" />
                <p className="text-xs font-semibold">No tienes notificaciones</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`p-4 transition-all ${
                    notif.read ? 'opacity-75 bg-card' : 'bg-primary/5 dark:bg-primary/10 border-l-2 border-primary'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-muted rounded-xl shrink-0">
                      {getNotificationIcon(notif.title)}
                    </div>
                    <div className="space-y-1 flex-1">
                      <h4 className="font-bold text-foreground text-xs leading-none">
                        {notif.title}
                      </h4>
                      <p className="text-[11px] text-muted-foreground leading-snug">
                        {notif.message}
                      </p>
                      <span className="block text-[9px] text-muted-foreground/60">
                        {new Date(notif.created_at).toLocaleString('es-AR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
