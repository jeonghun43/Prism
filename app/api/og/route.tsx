import { ImageResponse } from '@vercel/og'
import { NextRequest } from 'next/server'
import { sanitizeNickname, validateNickname } from '@/lib/security'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  let nickname = searchParams.get('nickname') || 'Prism'
  
  // Validate and sanitize nickname
  try {
    nickname = decodeURIComponent(nickname)
    const validation = validateNickname(nickname)
    if (!validation.valid) {
      nickname = 'Prism'
    } else {
      nickname = sanitizeNickname(nickname)
    }
  } catch {
    nickname = 'Prism'
  }

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#fef3f2',
          backgroundImage: 'linear-gradient(to bottom right, #fef3f2, #f3e8ff, #eef2ff)',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '80px',
          }}
        >
          <div
            style={{
              fontSize: 72,
              fontWeight: 'bold',
              background: 'linear-gradient(to right, #ec4899, #a855f7, #6366f1)',
              backgroundClip: 'text',
              color: 'transparent',
              marginBottom: 24,
            }}
          >
            Prism
          </div>
          <div
            style={{
              fontSize: 48,
              fontWeight: 'bold',
              color: '#1f2937',
              marginBottom: 16,
              textAlign: 'center',
            }}
          >
            {nickname}의 매력을 알려주세요!
          </div>
          <div
            style={{
              fontSize: 24,
              color: '#6b7280',
              textAlign: 'center',
            }}
          >
            익명으로 긍정적인 피드백을 남겨보세요
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  )
}

