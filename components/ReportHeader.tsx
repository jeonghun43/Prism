'use client'

import NotificationBell from './NotificationBell'

interface ReportHeaderProps {
  nickname: string
  userId: string
}

export default function ReportHeader({ nickname, userId }: ReportHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-4 sm:mb-6 md:mb-8 gap-3 sm:gap-4">
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-black flex-1">
        {nickname}의 매력 스펙트럼
      </h1>
      <NotificationBell userId={userId} />
    </div>
  )
}

