'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Copy, Check } from 'lucide-react'
import { validateNickname, sanitizeNickname } from '@/lib/security'

// Contact email for account retention requests
// Set NEXT_PUBLIC_CONTACT_EMAIL environment variable to customize
const CONTACT_EMAIL = (typeof window !== 'undefined' && (window as any).__NEXT_DATA__?.env?.NEXT_PUBLIC_CONTACT_EMAIL) || 
                      process.env.NEXT_PUBLIC_CONTACT_EMAIL || 
                      'jeongbzn01@gmail.com'

export default function LinkGenerator() {
  const [nickname, setNickname] = useState('')
  const [loading, setLoading] = useState(false)
  const [generatedLink, setGeneratedLink] = useState<string | null>(null)
  const [reportLink, setReportLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [generatedNickname, setGeneratedNickname] = useState<string>('')
  const supabase = createClient()

  // Normalize nickname: remove all spaces (leading, trailing, and in-between)
  const normalizeNickname = (input: string): string => {
    return input.replace(/\s+/g, '').trim()
  }

  // Handle nickname input change - prevent spaces in real-time
  const handleNicknameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    // Remove all spaces in real-time
    const normalized = normalizeNickname(value)
    setNickname(normalized)
  }

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Normalize nickname: remove all spaces
    const normalizedNickname = normalizeNickname(nickname)
    
    // Validate nickname
    const validation = validateNickname(normalizedNickname)
    if (!validation.valid) {
      alert(validation.error || '닉네임이 유효하지 않습니다.')
      return
    }

    // Sanitize nickname to prevent XSS
    const sanitizedNickname = sanitizeNickname(normalizedNickname).replace(/\s+/g, '')

    setLoading(true)
    try {
      const trimmedNickname = sanitizedNickname
      
      // Check if nickname already exists
      const { data: existingUser, error: fetchError } = await supabase
        .from('users')
        .select('id, nickname')
        .eq('nickname', trimmedNickname)
        .maybeSingle()

      if (fetchError && fetchError.code !== 'PGRST116') {
        // PGRST116 is "not found" error, which is expected
        throw fetchError
      }

      let userId: string

      if (existingUser) {
        // Show confirmation dialog if nickname already exists
        const isConfirmed = window.confirm(
          `"${trimmedNickname}"은(는) 이미 존재하는 닉네임입니다.\n\n` +
          `본인이 맞다면 "예"를 눌러서 진행하세요.\n` +
          `본인이 아니라면 "취소"를 눌러 새로운 닉네임을 입력하세요.`
        )

        if (!isConfirmed) {
          // User clicked cancel, clear nickname and return
          setNickname('')
          setLoading(false)
          return
        }

        // User confirmed, use existing user
        userId = existingUser.id
      } else {
        // Create new user
        const { data: newUser, error: insertError } = await supabase
          .from('users')
          .insert({ nickname: trimmedNickname })
          .select()
          .single()

        if (insertError) {
          console.error('Error creating user:', insertError)
          throw new Error(`사용자 생성 실패: ${insertError.message}`)
        }

        if (!newUser) {
          throw new Error('사용자 생성 후 데이터를 받지 못했습니다.')
        }

        userId = newUser.id

        // Initialize report lock
        const { error: lockError } = await supabase.from('report_locks').insert({
          user_id: userId,
          is_locked: true,
          minimum_responses: 5,
        })

        if (lockError) {
          console.error('Error creating report lock:', lockError)
          // Report lock error is not critical, continue
        }
      }

      const link = `${window.location.origin}/${encodeURIComponent(trimmedNickname)}`
      const reportUrl = `${window.location.origin}/${encodeURIComponent(trimmedNickname)}/report`
      setGeneratedLink(link)
      setReportLink(reportUrl)
      setGeneratedNickname(trimmedNickname)
    } catch (error: any) {
      console.error('Error generating link:', error)
      // Don't expose detailed error messages to users
      alert('링크 생성에 실패했습니다. 잠시 후 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    if (!generatedLink) return
    await navigator.clipboard.writeText(generatedLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }


  if (generatedLink) {
    return (
      <div className="bg-teal-50 rounded-xl sm:rounded-2xl shadow-xl p-5 sm:p-6 md:p-8 space-y-4 sm:space-y-6">
        <div className="text-center">
          <h2 className="text-xl sm:text-2xl font-bold text-black mb-2">
            {generatedNickname ? `${generatedNickname}님만의 링크가 생성되었습니다!🎉` : '링크가 생성되었습니다! 🎉'}
          </h2>
          <p className="text-gray-600 text-sm sm:text-base mb-3 sm:mb-4">
            이 링크를 공유하고 친구들의 피드백을 받아보세요
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
            <p className="text-xs sm:text-sm text-amber-800">
              ⚠️생성 후 7일이 지나면 링크와 응답 데이터는 자동으로 삭제됩니다. 유지하기 위해서는{' '}
              <a 
                href={`mailto:${CONTACT_EMAIL}`}
                className="underline font-semibold hover:text-amber-900"
              >
                {CONTACT_EMAIL}
              </a>
              으로 메일 주세요
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <button
            onClick={handleCopy}
            className="flex-1 bg-teal-500 text-white py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg font-semibold text-sm sm:text-base hover:bg-teal-600 transition-all flex items-center justify-center gap-2"
          >
            {copied ? (
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
            onClick={() => {
              if (reportLink) {
                window.open(reportLink, '_blank')
              }
            }}
            className="flex-1 bg-teal-500 text-white py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg font-semibold text-sm sm:text-base hover:bg-teal-600 transition-all"
          >
            보고서 보기
          </button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleGenerate} className="bg-teal-50 rounded-xl sm:rounded-2xl shadow-xl p-5 sm:p-6 md:p-8">
      <div className="space-y-4 sm:space-y-6">
        <div>
          <label htmlFor="nickname" className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
            닉네임을 입력하세요
          </label>
          <input
            id="nickname"
            type="text"
            value={nickname}
            onChange={handleNicknameChange}
            onKeyDown={(e) => {
              // Prevent space key input
              if (e.key === ' ') {
                e.preventDefault()
              }
            }}
            placeholder="이름보다 닉네임 사용을 권장합니다"
            className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-gray-200 rounded-lg focus:border-teal-500 focus:outline-none text-base sm:text-lg text-gray-900 bg-white placeholder:text-gray-400"
            required
            maxLength={50}
          />
          <p className="mt-2 text-xs sm:text-sm text-gray-500">
            공백 없이 입력해주세요. 이 닉네임으로 고유한 링크가 생성됩니다
          </p>
        </div>

        <button
          type="submit"
          disabled={loading || !normalizeNickname(nickname)}
          className="w-full bg-teal-500 text-white py-3 sm:py-4 px-4 sm:px-6 rounded-lg font-semibold text-base sm:text-lg hover:bg-teal-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? '생성 중...' : '링크 생성하기'}
        </button>
      </div>
    </form>
  )
}

