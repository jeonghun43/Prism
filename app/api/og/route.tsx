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

  try {
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
            backgroundColor: '#ffffff',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                fontSize: 96,
                fontWeight: 'bold',
                color: '#000000',
                marginBottom: 32,
                fontFamily: 'system-ui, -apple-system, sans-serif',
              }}
            >
              Prism
            </div>
            <div
              style={{
                fontSize: 32,
                color: '#6b7280',
                fontFamily: 'system-ui, -apple-system, sans-serif',
              }}
            >
              나만의 매력 스펙트럼을 발견하다
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    )
  } catch (error) {
    console.error('OG image generation error:', error)
    return new Response('Image generation failed', { status: 500 })
  }
}

