import { createClient } from '@/lib/supabase/server'
import ReportView from '@/components/ReportView'
import ReportHeader from '@/components/ReportHeader'
import { notFound } from 'next/navigation'
import { sanitizeNickname, validateNickname } from '@/lib/security'

type Props = {
  params: { nickname: string }
}

export default async function ReportPage({ params }: Props) {
  let nickname: string
  try {
    nickname = decodeURIComponent(params.nickname)
    // Validate and sanitize nickname
    const validation = validateNickname(nickname)
    if (!validation.valid) {
      notFound()
    }
    nickname = sanitizeNickname(nickname)
  } catch {
    notFound()
  }
  
  const supabase = await createClient()

  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, nickname')
    .eq('nickname', nickname as any)
    .single()

  if (userError || !user) {
    console.error('User not found:', userError)
    notFound()
  }

  // Type guard: ensure user is not null
  const userId = (user as { id: string; nickname: string }).id
  const userNickname = (user as { id: string; nickname: string }).nickname

  // Debug: Log user info
  console.log('Report page - User ID:', userId, 'Nickname:', userNickname)

  // Get report lock status
  const { data: lock, error: lockError } = await supabase
    .from('report_locks')
    .select('*')
    .eq('user_id', userId as any)
    .maybeSingle()

  // Get unique voter count (count distinct voter_session_id)
  // This counts the number of unique people who voted, not the number of responses
  const { data: voterSessions, error: voterCountError } = await supabase
    .from('responses')
    .select('voter_session_id')
    .eq('user_id', userId as any)
    .not('voter_session_id', 'is', null)

  // Count unique voter sessions
  const uniqueVoterCount = voterSessions && Array.isArray(voterSessions)
    ? new Set(voterSessions.map((r: any) => r.voter_session_id).filter((id: any) => id !== null)).size 
    : 0

  const lockData = lock as { is_locked: boolean; minimum_responses: number } | null
  const actualVoterCount = uniqueVoterCount
  const minimumResponses = lockData?.minimum_responses || 5

  // Calculate isLocked:
  // - If lock doesn't exist (null), lock if voter count is below minimum
  // - If lock exists and is_locked is false, unlock (already unlocked)
  // - If lock exists and is_locked is true, lock if voter count is below minimum
  let isLocked: boolean
  if (!lockData) {
    // No lock record exists - default to locked if below minimum
    isLocked = actualVoterCount < minimumResponses
  } else if (lockData.is_locked === false) {
    // Already unlocked
    isLocked = false
  } else {
    // Lock exists and is_locked is true - check if we should unlock
    isLocked = actualVoterCount < minimumResponses
  }

  // Debug: Log lock status
  console.log('Report page - Lock status:', {
    lockExists: !!lockData,
    is_locked: lockData?.is_locked,
    uniqueVoterCount: actualVoterCount,
    minimumResponses,
    calculatedIsLocked: isLocked,
  })

  // Get all responses with questions - explicitly filter by user_id
  const { data: responses, error: responsesError } = await supabase
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
    .eq('user_id', userId as any)
    .order('created_at', { ascending: false })

  if (responsesError) {
    console.error('Error fetching responses:', responsesError)
  }

  // Type assertion for responses
  type ResponseWithQuestion = {
    id: string
    question_id: string
    selected_option_id: number
    user_id: string
    questions: {
      id: string
      question_text: string
      options: Array<{ id: number; text: string }>
      category: string | null
    }
  }

  const typedResponses = (responses || []) as unknown as ResponseWithQuestion[]

  // Debug: Log responses info
  console.log('Report page - User ID:', userId, 'Responses count:', typedResponses.length)
  if (typedResponses.length > 0) {
    console.log('Report page - First response user_id:', typedResponses[0].user_id)
  }

  return (
    <main className="min-h-screen bg-white flex items-center justify-center p-3 sm:p-4 md:p-6">
      <div className="max-w-4xl w-full my-auto">
        <ReportHeader nickname={userNickname} userId={userId} />
        <ReportView
          userId={userId}
          nickname={userNickname}
          responses={typedResponses}
          isLocked={isLocked}
          responseCount={actualVoterCount}
          minimumResponses={minimumResponses}
        />
      </div>
    </main>
  )
}

