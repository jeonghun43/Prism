'use client'

import { useMemo, useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Lock, Share2, Copy, Check } from 'lucide-react'

interface Response {
  id: string
  question_id: string
  selected_option_id: number
  questions: {
    id: string
    question_text: string
    options: Array<{ id: number; text: string; tag?: string }>
    category: string | null
  }
}

interface ReportViewProps {
  userId: string
  nickname: string
  responses: Response[]
  isLocked: boolean
  responseCount: number
  minimumResponses: number
}

const COLORS = ['#ec4899', '#a855f7', '#6366f1', '#f59e0b', '#10b981']

export default function ReportView({
  userId,
  nickname,
  responses: initialResponses,
  isLocked: initialIsLocked,
  responseCount: initialResponseCount,
  minimumResponses,
}: ReportViewProps) {
  const [copied, setCopied] = useState(false)
  const [votingLinkCopied, setVotingLinkCopied] = useState(false)
  const [responseCount, setResponseCount] = useState(initialResponseCount)
  const [isLocked, setIsLocked] = useState(initialIsLocked)
  const [responses, setResponses] = useState(initialResponses)
  const supabase = createClient()

  // Real-time subscription for responses
  useEffect(() => {
    // Function to update voter count
    const updateVoterCount = async () => {
      const { data: voterSessions } = await supabase
        .from('responses')
        .select('voter_session_id')
        .eq('user_id', userId)
        .not('voter_session_id', 'is', null)

      const uniqueVoterCount = voterSessions && Array.isArray(voterSessions)
        ? new Set(voterSessions.map((r: any) => r.voter_session_id).filter((id: any) => id !== null)).size
        : 0

      setResponseCount(uniqueVoterCount)

      // Check lock status
      const { data: lock } = await supabase
        .from('report_locks')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()

      const lockData = lock as { is_locked: boolean; minimum_responses: number } | null
      const minResponses = lockData?.minimum_responses || minimumResponses

      if (!lockData) {
        setIsLocked(uniqueVoterCount < minResponses)
      } else if (lockData.is_locked === false) {
        setIsLocked(false)
      } else {
        setIsLocked(uniqueVoterCount < minResponses)
      }

      // Refresh responses if unlocked (check current lock status)
      const shouldBeUnlocked = !lockData || (lockData.is_locked === false) || (uniqueVoterCount >= minResponses)
      if (shouldBeUnlocked) {
        const { data: updatedResponses } = await supabase
          .from('responses')
          .select(`
            *,
            questions (
              id,
              question_text,
              options,
              category
            )
          `)
          .eq('user_id', userId)
          .order('created_at', { ascending: false })

        if (updatedResponses) {
          setResponses(updatedResponses as unknown as Response[])
        }
      }
    }

    // Subscribe to responses table changes
    const channel = supabase
      .channel(`responses:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'responses',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          // Update voter count when new response is inserted
          updateVoterCount()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'responses',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          // Update voter count when response is deleted
          updateVoterCount()
        }
      )
      .subscribe()

    // Also subscribe to report_locks changes
    const lockChannel = supabase
      .channel(`locks:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'report_locks',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          updateVoterCount()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
      supabase.removeChannel(lockChannel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  // Calculate statistics - find the top 3 most selected tags
  const topTags = useMemo(() => {
    if (!responses || responses.length === 0) return []

    // Count tags across all responses
    // Multiple options can have the same tag, so we aggregate by tag
    const tagCounts: Record<string, { count: number; tag: string; examples: string[] }> = {}

    responses.forEach((response) => {
      const question = response.questions
      if (!question) return

      const selectedOption = question.options.find(
        (opt) => opt.id === response.selected_option_id
      )

      if (selectedOption && selectedOption.tag) {
        const tag = selectedOption.tag
        
        if (!tagCounts[tag]) {
          tagCounts[tag] = {
            count: 0,
            tag: tag,
            examples: [],
          }
        }
        
        tagCounts[tag].count += 1
        
        // Store example option text (max 3 examples per tag)
        if (tagCounts[tag].examples.length < 3 && !tagCounts[tag].examples.includes(selectedOption.text)) {
          tagCounts[tag].examples.push(selectedOption.text)
        }
      }
    })

    // Get the top 3 most selected tags
    const topTagsList = Object.entries(tagCounts)
      .map(([tag, data]) => ({
        tag: data.tag,
        count: data.count,
        examples: data.examples,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)

    // Debug log
    console.log('Top tags calculation:', {
      totalResponses: responses.length,
      tagCountsSize: Object.keys(tagCounts).length,
      topTags: topTagsList,
    })

    return topTagsList
  }, [responses])

  const handleCopy = async () => {
    const reportUrl = `${window.location.origin}/${encodeURIComponent(nickname)}/report`
    await navigator.clipboard.writeText(reportUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleCopyVotingLink = async () => {
    const votingUrl = `${window.location.origin}/${encodeURIComponent(nickname)}`
    await navigator.clipboard.writeText(votingUrl)
    setVotingLinkCopied(true)
    setTimeout(() => setVotingLinkCopied(false), 2000)
  }

  const handleShareVotingLink = async () => {
    const votingUrl = `${window.location.origin}/${encodeURIComponent(nickname)}`
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${nickname}의 매력을 알려주세요!`,
          text: `${nickname}의 매력을 발견하는 데 도움을 주세요!`,
          url: votingUrl,
        })
      } catch (err) {
        // User cancelled or error
        console.log('Share cancelled')
      }
    } else {
      // Fallback to copy
      handleCopyVotingLink()
    }
  }

  if (isLocked) {
    return (
      <div className="bg-teal-50 rounded-xl sm:rounded-2xl shadow-xl p-5 sm:p-6 md:p-8 text-center space-y-4 sm:space-y-6 border-2 border-teal-200">
        <div className="flex justify-center">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-200 rounded-full flex items-center justify-center">
            <Lock className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400" />
          </div>
        </div>
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-black">리포트가 잠겨있습니다</h2>
        <p className="text-gray-600 text-sm sm:text-base md:text-lg px-2">
          리포트를 보려면 최소 {minimumResponses}명의 응답이 필요합니다
        </p>
        <div className="bg-gray-50 rounded-lg p-4 sm:p-6">
          <p className="text-xl sm:text-2xl font-bold text-teal-600 mb-2">
            {responseCount} / {minimumResponses}
          </p>
          <p className="text-gray-600 text-sm sm:text-base">현재 응답 수</p>
        </div>
        <div className="space-y-3 sm:space-y-4 pt-2 sm:pt-4">
          <p className="text-gray-700 text-sm sm:text-base md:text-lg font-semibold px-2">
            링크를 더 공유해서 리포트 잠금을 '무료로' 풀어보세요
          </p>
          <button
            onClick={handleCopyVotingLink}
            className="w-full bg-teal-500 text-white py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg font-semibold text-sm sm:text-base hover:bg-teal-600 transition-all flex items-center justify-center gap-2"
          >
            {votingLinkCopied ? (
              <>
                <Check className="w-4 h-4 sm:w-5 sm:h-5" />
                복사됨!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 sm:w-5 sm:h-5" />
                링크 복사
              </>
            )}
          </button>
        </div>
      </div>
    )
  }

  // Check if there are any responses (isLocked already checked above)
  if (!responses || responses.length === 0) {
    return (
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl p-5 sm:p-6 md:p-8 text-center">
        <p className="text-gray-600 text-sm sm:text-base">아직 응답이 없습니다.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">

      {/* Voting Link Actions */}
      <div className="bg-teal-50 rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-5 md:p-6">
        <p className="text-center text-sm sm:text-base md:text-lg font-bold text-gray-800 mb-3 sm:mb-4">
          15명 이상의 답변은 더욱 정확한 피드백을 만듭니다!
        </p>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <button
            onClick={handleCopyVotingLink}
            className="flex-1 bg-teal-500 text-white py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg font-semibold text-sm sm:text-base hover:bg-teal-600 transition-all flex items-center justify-center gap-2"
          >
            {votingLinkCopied ? (
              <>
                <Check className="w-4 h-4 sm:w-5 sm:h-5" />
                복사됨!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 sm:w-5 sm:h-5" />
                링크 복사
              </>
            )}
          </button>
          <button
            onClick={handleShareVotingLink}
            className="flex-1 bg-teal-500 text-white py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg font-semibold text-sm sm:text-base hover:bg-teal-600 transition-all flex items-center justify-center gap-2"
          >
            <Share2 className="w-4 h-4 sm:w-5 sm:h-5" />
            공유하기
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-teal-50 rounded-xl sm:rounded-2xl shadow-xl p-5 sm:p-6 md:p-8 border-2 border-teal-200">
        <h2 className="text-xl sm:text-2xl font-bold text-black mb-3 sm:mb-4">요약</h2>
        <div className="space-y-4 sm:space-y-6">
          <div>
            <p className="text-xs sm:text-sm text-gray-600 mb-1">응답한 사람의 수</p>
            <p className="text-2xl sm:text-3xl font-bold text-teal-600">{responseCount}명</p>
          </div>
          {topTags.length > 0 && (
            <div>
              <p className="text-xs sm:text-sm text-gray-600 mb-3">가장 많은 응답을 받은 요소 TOP3</p>
              <div className="space-y-2 sm:space-y-3">
                {topTags.map((tagData, index) => (
                  <div
                    key={`${tagData.tag}-${index}`}
                    className="bg-white rounded-lg p-3 sm:p-4 border-2 border-teal-200"
                  >
                    <div className="flex items-start justify-between gap-2 sm:gap-3">
                      <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                        <div className="w-6 h-6 sm:w-8 sm:h-8 bg-teal-500 rounded-full flex items-center justify-center text-white font-bold text-xs sm:text-sm flex-shrink-0">
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-base sm:text-lg font-bold text-black break-words">{tagData.tag}</p>
                          {tagData.examples.length > 0 && (
                            <p className="text-xs text-gray-500 mt-1 break-words">
                              {tagData.examples.join(', ')}
                              {tagData.examples.length < tagData.count && ` 외 ${tagData.count - tagData.examples.length}개`}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-lg sm:text-xl font-bold text-teal-600">{tagData.count}</p>
                        <p className="text-xs text-gray-500">표</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


