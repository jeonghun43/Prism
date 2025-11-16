'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle, Sparkles } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Question {
  id: string
  question_text: string
  options: Array<{ id: number; text: string; tag?: string }>
  category: string | null
}

interface VotingInterfaceProps {
  userId: string
  questions: Question[]
  nickname: string
}

// 매력 키워드 리스트
const charmKeywords = [
  '다정한', '밝은', '따뜻한', '유쾌한', '차분한', '신뢰감 있는',
  '창의적인', '영감을 주는', '에너지 넘치는', '균형잡힌', '독특한',
  '배려심 깊은', '긍정적인', '자연스러운', '매력적인'
]

export default function VotingInterface({ userId, questions, nickname }: VotingInterfaceProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedOptions, setSelectedOptions] = useState<Record<string, number>>({})
  const [visualSelectedOption, setVisualSelectedOption] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [charmKeyword, setCharmKeyword] = useState<string>('')
  const router = useRouter()
  const supabase = createClient()
  const currentIndexRef = useRef(currentIndex)
  const voterSessionIdRef = useRef<string | null>(null)
  const touchHandledRef = useRef<Record<number, boolean>>({})
  
  // Keep ref in sync with state
  useEffect(() => {
    currentIndexRef.current = currentIndex
    // Reset visual selection when question changes
    setVisualSelectedOption(null)
  }, [currentIndex])

  // Generate a unique session ID for this voting session
  useEffect(() => {
    if (!voterSessionIdRef.current) {
      voterSessionIdRef.current = crypto.randomUUID()
    }
  }, [])

  const currentQuestion = questions[currentIndex]
  const progress = questions.length > 0 ? (currentIndex / questions.length) * 100 : 0

  const handleOptionSelect = (optionId: number, isTouchEvent: boolean = false) => {
    if (!currentQuestion || isSubmitting) return
    
    // Set visual selection immediately
    setVisualSelectedOption(optionId)
    
    // Update selected option
    const updatedOptions = {
      ...selectedOptions,
      [currentQuestion.id]: optionId,
    }
    setSelectedOptions(updatedOptions)

    // Advance to next question after 200ms delay
    setTimeout(() => {
      const currentIdx = currentIndexRef.current
      if (currentIdx < questions.length - 1) {
        // Move to next question
        setCurrentIndex(currentIdx + 1)
        // Visual selection will be cleared by useEffect when currentIndex changes
      } else {
        // Last question - auto submit
        handleSubmitWithOptions(updatedOptions)
      }
    }, 200) // 200ms delay to show selection feedback
  }

  const handleSubmitWithOptions = async (optionsToSubmit: Record<string, number>) => {
    setIsSubmitting(true)
    try {
      // Submit all responses with the same voter_session_id
      const sessionId = voterSessionIdRef.current || crypto.randomUUID()
      const responses = Object.entries(optionsToSubmit).map(([questionId, optionId]) => ({
        user_id: userId,
        question_id: questionId,
        selected_option_id: optionId,
        voter_session_id: sessionId,
      }))

      // Debug: Log submission info
      console.log('Submitting responses for user_id:', userId)
      console.log('Responses to submit:', responses)

      // Use insert instead of upsert to allow multiple responses from different sessions
      // First, delete any existing responses from this session to allow re-voting
      const questionIds = Object.keys(optionsToSubmit)
      if (questionIds.length > 0) {
        await supabase
          .from('responses')
          .delete()
          .eq('user_id', userId)
          .eq('voter_session_id', sessionId)
          .in('question_id', questionIds)
      }

      // Insert new responses for this session
      const { error, data } = await supabase
        .from('responses')
        .insert(responses)
        .select()

      if (error) {
        console.error('Error submitting responses:', error)
        throw error
      }

      console.log('Successfully submitted responses:', data)

      // Check if we should unlock the report
      // Count unique voters (distinct voter_session_id) instead of total responses
      const { data: uniqueVoters, error: countError } = await supabase
        .from('responses')
        .select('voter_session_id')
        .eq('user_id', userId)
        .not('voter_session_id', 'is', null)

      // Get count of unique voter sessions
      const voterCount = uniqueVoters && Array.isArray(uniqueVoters)
        ? new Set(uniqueVoters.map((r: any) => r.voter_session_id).filter((id: any) => id !== null)).size
        : 0

      const { data: lock } = await supabase
        .from('report_locks')
        .select('*')
        .eq('user_id', userId)
        .single()

      const wasLocked = lock && lock.is_locked
      const isUnlocking = wasLocked && voterCount >= (lock.minimum_responses || 5)
      
      if (isUnlocking) {
        await supabase
          .from('report_locks')
          .update({ is_locked: false, unlocked_at: new Date().toISOString() })
          .eq('user_id', userId)
        
        // Create unlock notification
        await supabase
          .from('notifications')
          .insert({
            user_id: userId,
            type: 'report_unlocked',
            message: `축하합니다! 리포트가 잠금 해제되었습니다. ${voterCount}명의 응답을 받았어요.`,
            metadata: {
              voter_count: voterCount,
              is_unlocked: true,
            },
          })
      } else {
        // Create new response notification
        await supabase
          .from('notifications')
          .insert({
            user_id: userId,
            type: 'new_response',
            message: `새로운 응답이 도착했습니다! 현재 ${voterCount}명이 응답했습니다.`,
            metadata: {
              voter_count: voterCount,
              is_unlocked: false,
            },
          })
      }

      // 랜덤하게 매력 키워드 선택
      const randomCharm = charmKeywords[Math.floor(Math.random() * charmKeywords.length)]
      setCharmKeyword(randomCharm)
      setIsComplete(true)
    } catch (error) {
      console.error('Error submitting responses:', error)
      // Don't expose detailed error messages to users
      alert('제출에 실패했습니다. 잠시 후 다시 시도해주세요.')
      setIsSubmitting(false)
    }
  }

  if (isComplete) {
    return (
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl p-5 sm:p-6 md:p-8 text-center space-y-4 sm:space-y-6">
        <div className="flex justify-center">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-teal-500 rounded-full flex items-center justify-center">
            <CheckCircle className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
          </div>
        </div>
        <div className="space-y-2 sm:space-y-3">
          <p className="text-gray-700 text-base sm:text-lg">
            답변해줘서 고마워요.
          </p>
          <p className="text-gray-800 text-lg sm:text-xl font-semibold px-2">
            <span className="text-teal-600 font-bold">{nickname}</span>님은 당신을{' '}
            <span className="text-teal-600 font-bold">'{charmKeyword}'</span> 매력으로 기억할 거예요.
          </p>
        </div>
        <div className="bg-teal-50 rounded-lg p-4 sm:p-6 border-2 border-teal-200">
          <h3 className="text-lg sm:text-xl font-bold text-black mb-2 sm:mb-3">
          Prism 링크로 나의 매력 알아보기
          </h3>
          <p className="text-gray-700 mb-3 sm:mb-4 text-sm sm:text-base md:text-lg">
          친구들이 생각하는 당신의 '반전 매력'이 궁금하지 않나요?
          </p>
          <button
            onClick={() => router.push('/')}
            className="bg-teal-500 text-white py-2.5 sm:py-3 px-6 sm:px-8 rounded-lg font-semibold text-sm sm:text-base md:text-lg hover:bg-teal-600 transition-all inline-flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
            궁금해요!
          </button>
        </div>
      </div>
    )
  }

  if (!currentQuestion) {
    return (
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl p-5 sm:p-6 md:p-8 text-center">
        <p className="text-gray-600 text-sm sm:text-base">질문을 불러오는 중...</p>
      </div>
    )
  }

  // Use visual selection state for display, fallback to saved selection for navigation
  const displaySelectedOption = visualSelectedOption ?? selectedOptions[currentQuestion.id]

  return (
    <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-6 md:p-8 border-2 border-teal-200">
      {/* Progress bar */}
      <div className="mb-4 sm:mb-6">
        <div className="flex justify-between text-xs sm:text-sm text-gray-600 mb-2">
          <span>질문 {currentIndex + 1} / {questions.length}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-teal-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="mb-6 sm:mb-8">
        <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-black mb-4 sm:mb-6 px-1">
          {currentQuestion.question_text}
        </h2>
        <div className="space-y-2 sm:space-y-3">
          {currentQuestion.options.map((option) => (
            <button
              key={option.id}
              onClick={(e) => {
                // Prevent click if touch event was already handled (mobile browsers fire click after touch)
                if (touchHandledRef.current[option.id]) {
                  e.preventDefault()
                  e.stopPropagation()
                  touchHandledRef.current[option.id] = false
                  return
                }
                handleOptionSelect(option.id)
              }}
              onTouchStart={() => {
                touchHandledRef.current[option.id] = false
              }}
              onTouchEnd={(e) => {
                // Prevent default to avoid mobile browser highlight persistence
                e.preventDefault()
                e.stopPropagation()
                touchHandledRef.current[option.id] = true
                handleOptionSelect(option.id, true)
                // Reset after a short delay to allow click event to check
                setTimeout(() => {
                  touchHandledRef.current[option.id] = false
                }, 300)
              }}
              className={`w-full text-left p-3 sm:p-4 rounded-lg border-2 transition-all text-sm sm:text-base touch-manipulation ${
                displaySelectedOption === option.id
                  ? 'border-teal-500 bg-teal-50 text-teal-700 font-semibold'
                  : 'border-gray-200 hover:border-teal-500 hover:bg-teal-50 text-gray-900 bg-white active:bg-teal-50'
              }`}
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              {option.text}
            </button>
          ))}
        </div>
      </div>

      {/* Navigation */}
      {currentIndex > 0 && (
        <div className="flex justify-start">
          <button
            onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0 || isSubmitting}
            className="px-4 sm:px-6 py-2 text-sm sm:text-base text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            이전
          </button>
        </div>
      )}
    </div>
  )
}

