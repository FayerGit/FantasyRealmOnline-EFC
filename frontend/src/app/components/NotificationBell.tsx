import { useState, useEffect, useRef } from "react";
import { notificationAPI, Notification } from "../services/notificationAPI";

interface NotificationBellProps {
  isLoggedIn: boolean;
}

export const NotificationBell = ({ isLoggedIn }: NotificationBellProps) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 });

  const fetchUnreadCount = async () => {
    if (!isLoggedIn) return;

    const result = await notificationAPI.getUnreadCount();
    if (result.count !== undefined) {
      setUnreadCount(result.count);
    }
  };

  const fetchNotifications = async () => {
    if (!isLoggedIn) return;

    setIsLoading(true);
    const result = await notificationAPI.getNotifications();
    if (result.notifications) {
      setNotifications(result.notifications);
    }
    setIsLoading(false);
  };

  // Charger le nombre de messages non lus régulièrement
  useEffect(() => {
    if (!isLoggedIn) return;

    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [isLoggedIn]);

  // Charger les notifications quand le menu s'ouvre
  useEffect(() => {
    if (isOpen && isLoggedIn) {
      fetchNotifications();
    }
  }, [isOpen, isLoggedIn]);

  // Refresh when another component signals that notifications changed
  useEffect(() => {
    const handleNotificationsChanged = () => {
      if (!isLoggedIn) return;
      fetchUnreadCount();
      if (isOpen) {
        fetchNotifications();
      }
    };

    window.addEventListener("notifications:changed", handleNotificationsChanged);
    return () => window.removeEventListener("notifications:changed", handleNotificationsChanged);
  }, [isLoggedIn, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const updateDropdownPosition = () => {
      if (!bellRef.current) return;
      const rect = bellRef.current.getBoundingClientRect();
      const right = Math.max(16, window.innerWidth - rect.right);
      const top = rect.bottom + 8;
      setDropdownPos({ top, right });
    };

    updateDropdownPosition();

    window.addEventListener("resize", updateDropdownPosition);
    window.addEventListener("scroll", updateDropdownPosition, true);

    return () => {
      window.removeEventListener("resize", updateDropdownPosition);
      window.removeEventListener("scroll", updateDropdownPosition, true);
    };
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const handleBellClick = () => {
    setIsOpen(!isOpen);
  };

  const handleMarkAsRead = async (id: number) => {
    await notificationAPI.markAsRead(id);
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, is_read: 1 } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const handleMarkAllAsRead = async () => {
    const result = await notificationAPI.markAllAsRead();
    if (result.success) {
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
      setUnreadCount(0);
    }
  };

  const handleDelete = async (id: number) => {
    const result = await notificationAPI.deleteNotification(id);
    if (result.success) {
      setNotifications(prev => prev.filter(n => n.id !== id));
      const wasUnread = notifications.find(n => n.id === id)?.is_read === 0;
      if (wasUnread) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'system_message':
        return 'SYS';
      case 'character_created':
        return 'NEW';
      case 'character_approved':
        return 'OK';
      case 'character_rejected':
        return 'NO';
      case 'comment_approved':
        return 'OK';
      case 'comment_rejected':
        return 'NO';
      case 'comment_received':
        return 'NEW';
      case 'admin_message':
        return '!';
      default:
        return 'i';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  if (!isLoggedIn) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon */}
      <button
        onClick={handleBellClick}
        ref={bellRef}
        className="relative p-2 hover:bg-white/10 rounded transition-colors"
        aria-label="Notifications"
      >
        <svg
          className="w-6 h-6 text-white"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        
        {/* Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-[9998] bg-black/40"
            onClick={() => setIsOpen(false)}
          />
          <div
            className="notification-scrollbar fixed w-80 max-w-[90vw] bg-[#1a1a1a] border border-white/20 rounded shadow-lg z-[9999] max-h-[70vh] overflow-y-auto"
            style={{ top: dropdownPos.top, right: dropdownPos.right }}
            onClick={(event) => event.stopPropagation()}
          >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/20">
            <h3 className="text-white font-bold">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Notifications List */}
          {isLoading ? (
            <div className="p-8 text-center text-white/60">Loading...</div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center text-white/60">No notifications</div>
          ) : (
            <div className="divide-y divide-white/10">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`p-4 hover:bg-white/5 transition-colors ${
                    notif.is_read === 0 ? 'bg-blue-500/10' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div className="text-2xl flex-shrink-0">
                      {getNotificationIcon(notif.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-white font-semibold text-sm">
                          {notif.title}
                        </h4>
                        {notif.is_read === 0 && (
                          <button
                            onClick={() => handleMarkAsRead(notif.id)}
                            className="text-blue-400 hover:text-blue-300 text-xs flex-shrink-0"
                            title="Mark as read"
                          >
                            Read
                          </button>
                        )}
                      </div>
                      <p className="text-white/70 text-sm mt-1">
                        {notif.message}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-white/50 text-xs">
                          {formatTimeAgo(notif.created_at)}
                        </span>
                        <button
                          onClick={() => handleDelete(notif.id)}
                          className="text-red-400 hover:text-red-300 text-xs"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          </div>
        </>
      )}
    </div>
  );
};
