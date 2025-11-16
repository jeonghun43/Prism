import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import VotingInterface from '@/components/VotingInterface'
import { notFound } from 'next/navigation'
import { sanitizeNickname, validateNickname } from '@/lib/security'

type Props = {
  params: { nickname: string }
}

// Generate dynamic metadata for OG tags
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  let nickname: string
  try {
    nickname = decodeURIComponent(params.nickname)
    // Validate and sanitize nickname
    const validation = validateNickname(nickname)
    if (!validation.valid) {
      return {
        title: 'Prism - 사용자를 찾을 수 없습니다',
      }
    }
    nickname = sanitizeNickname(nickname)
  } catch {
    return {
      title: 'Prism - 사용자를 찾을 수 없습니다',
    }
  }
  
  const supabase = await createClient()

  const { data: user } = await supabase
    .from('users')
    .select('nickname')
    .eq('nickname', nickname as any)
    .single()

  if (!user) {
    return {
      title: 'Prism - 사용자를 찾을 수 없습니다',
    }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  const pageUrl = `${appUrl}/${encodeURIComponent(nickname)}`

  return {
    title: `${nickname}의 매력을 알려주세요! - Prism`,
    description: `${nickname}의 매력을 발견하는 데 도움을 주세요! 익명으로 긍정적인 피드백을 남겨보세요.`,
    openGraph: {
      title: `${nickname}의 매력을 알려주세요!`,
      description: `${nickname}의 매력을 발견하는 데 도움을 주세요!`,
      url: pageUrl,
      siteName: 'Prism',
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title: `${nickname}의 매력을 알려주세요!`,
      description: `${nickname}의 매력을 발견하는 데 도움을 주세요!`,
    },
  }
}

export default async function VotingPage({ params }: Props) {
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

  const { data: user, error } = await supabase
    .from('users')
    .select('id, nickname')
    .eq('nickname', nickname as any)
    .single()

  if (error || !user) {
    notFound()
  }

  // Get active questions
  const { data: questions } = await supabase
    .from('questions')
    .select('*')
    .eq('is_active', true as any)
    .order('created_at', { ascending: true })

  // Type assertions for Supabase query results
  const userData = user as { id: string; nickname: string }
  const questionsData = (questions || []) as unknown as Array<{
    id: string
    question_text: string
    options: Array<{ id: number; text: string; tag?: string }>
    category: string | null
  }>

  return (
    <main className="min-h-screen bg-white flex items-center justify-center p-3 sm:p-4 md:p-6">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-4 sm:mb-6 md:mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 text-black px-2">
            {nickname}의 매력을 알려주세요
          </h1>
          <p className="text-gray-600 text-sm sm:text-base px-2">
            익명으로 긍정적인 피드백을 남겨주세요
          </p>
        </div>
        <div className="bg-teal-50 rounded-xl sm:rounded-2xl p-3 sm:p-4">
          <VotingInterface userId={userData.id} questions={questionsData} nickname={userData.nickname} />
        </div>
      </div>
    </main>
  )
}

