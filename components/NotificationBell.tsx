'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Bell } from 'lucide-react'

interface Notification {
  id: string
  type: string
  message: string
  is_read: boolean
  created_at: string
  metadata?: {
    voter_count?: number
    is_unlocked?: boolean
  }
}

interface NotificationBellProps {
  userId: string
}

export default function NotificationBell({ userId }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    // Fetch initial notifications
    const fetchNotifications = async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10)

      if (data) {
        setNotifications(data as Notification[])
        setUnreadCount(data.filter((n: Notification) => !n.is_read).length)
      }
    }

    fetchNotifications()

    // Subscribe to real-time notifications
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification
          setNotifications((prev) => [newNotification, ...prev])
          setUnreadCount((prev) => prev + 1)
          
          // Show browser notification if permission granted
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Prism 알림', {
              body: newNotification.message,
              icon: '/favicon.ico',
            })
          }
        }
      )
      .subscribe()

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }

    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  const markAsRead = async (notificationId: string) => {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)

    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
    )
    setUnreadCount((prev) => Math.max(0, prev - 1))
  }

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id)
    if (unreadIds.length === 0) return

    await supabase
      .from('notifications')
      .update({ is_read: true })
      .in('id', unreadIds)

    setNotifications((prev) =>
      prev.map((n) => ({ ...n, is_read: true }))
    )
    setUnreadCount(0)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-1.5 sm:p-2 text-gray-600 hover:text-gray-800 transition-colors"
      >
        <Bell className="w-5 h-5 sm:w-6 sm:h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 w-4 h-4 sm:w-5 sm:h-5 bg-teal-500 text-white text-xs font-bold rounded-full flex items-center justify-center text-[10px] sm:text-xs">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white rounded-lg shadow-xl border-2 border-teal-200 z-20 max-h-[80vh] sm:max-h-96 overflow-hidden flex flex-col">
            <div className="p-3 sm:p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-bold text-black text-sm sm:text-base">알림</h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs sm:text-sm text-teal-600 hover:text-teal-700"
                >
                  모두 읽음
                </button>
              )}
            </div>
            <div className="overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm">
                  알림이 없습니다
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => {
                      if (!notification.is_read) {
                        markAsRead(notification.id)
                      }
                    }}
                    className={`p-3 sm:p-4 border-b border-gray-100 cursor-pointer hover:bg-teal-50 transition-colors ${
                      !notification.is_read ? 'bg-teal-50' : ''
                    }`}
                  >
                    <p className="text-xs sm:text-sm text-gray-800">{notification.message}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(notification.created_at).toLocaleString('ko-KR', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

