import React, { useState } from 'react';
import { Bell, X, Eye, Clock, CheckCircle, AlertCircle, Trash2 } from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { cn } from '../lib/utils';

const RealtimeNotifications = () => {
  const { notifications, isConnected, clearNotifications } = useSocket();
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  React.useEffect(() => {
    setUnreadCount(notifications.length);
  }, [notifications]);

  const handleToggle = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setUnreadCount(0); // Mark as read when opened
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'audit-created':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'audit-updated':
        return <Eye className="w-4 h-4 text-blue-500" />;
      case 'audit-deleted':
        return <Trash2 className="w-4 h-4 text-red-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'audit-created':
        return 'border-l-green-500 bg-green-50';
      case 'audit-updated':
        return 'border-l-blue-500 bg-blue-50';
      case 'audit-deleted':
        return 'border-l-red-50 bg-red-50';
      default:
        return 'border-l-yellow-500 bg-yellow-50';
    }
  };

  const getEntityLabel = (entity, fallback = 'N/A') => {
    if (!entity) return fallback;
    if (typeof entity === 'string' || typeof entity === 'number') return String(entity);
    if (typeof entity === 'object') {
      if (entity.name) return entity.name;
      if (entity.id) return String(entity.id);
    }
    return fallback;
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="relative">
      {/* Notification Bell Button */}
      <button
        onClick={handleToggle}
        className={cn(
          "relative p-2 rounded-lg transition-colors duration-200",
          "hover:bg-gray-100 dark:hover:bg-gray-800",
          isConnected ? "text-gray-700 dark:text-gray-300" : "text-gray-400"
        )}
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        
        {/* Connection Status Indicator */}
        <div
          className={cn(
            "absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-gray-900",
            isConnected ? "bg-green-500" : "bg-red-500"
          )}
        />
        
        {/* Unread Count Badge */}
        {unreadCount > 0 && (
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
            {unreadCount > 99 ? '99+' : unreadCount}
          </div>
        )}
      </button>

      {/* Notifications Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                Live Notifications
              </h3>
              <div className={cn(
                "w-2 h-2 rounded-full",
                isConnected ? "bg-green-500" : "bg-red-500"
              )} />
            </div>
            <div className="flex items-center gap-1">
              {notifications.length > 0 && (
                <button
                  onClick={clearNotifications}
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  title="Clear all"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={handleToggle}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                <Bell className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No notifications yet</p>
                <p className="text-sm mt-1">
                  {isConnected ? "You'll see real-time updates here" : "Connecting..."}
                </p>
              </div>
            ) : (
              <div className="py-2">
                {notifications.map((notification, index) => (
                  <div
                    key={`${notification.auditId}-${notification.timestamp}-${index}`}
                    className={cn(
                      "p-3 mx-2 mb-2 rounded-md border-l-4 transition-colors duration-200 hover:bg-gray-50 dark:hover:bg-gray-700",
                      getNotificationColor(notification.type)
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {notification.message}
                        </p>
                        {notification.auditor && (
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                            By: {notification.auditor}
                          </p>
                        )}
                        {notification.updatedBy && (
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                            Updated by: {notification.updatedBy}
                          </p>
                        )}
                        {(notification.line || notification.machine) && (
                          <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                            {notification.line && (
                              <>Line: {getEntityLabel(notification.line, 'Unknown line')}</>
                            )}
                            {notification.line && notification.machine && ' | '}
                            {notification.machine && (
                              <>Machine: {getEntityLabel(notification.machine, 'Unknown machine')}</>
                            )}
                          </p>
                        )}
                      </div>
                      <div className="flex-shrink-0 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                        <Clock className="w-3 h-3" />
                        {formatTimestamp(notification.timestamp)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-gray-200 dark:border-gray-700 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Status: {isConnected ? (
                <span className="text-green-600 font-medium">Connected</span>
              ) : (
                <span className="text-red-600 font-medium">Disconnected</span>
              )}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default RealtimeNotifications;
