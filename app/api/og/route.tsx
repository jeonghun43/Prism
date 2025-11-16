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
            padding: '40px',
          }}
        >
          {/* 외부 컨테이너 - 실제 사이트와 동일한 레이아웃 */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              width: '100%',
              maxWidth: '800px',
            }}
          >
            {/* 헤더 영역 */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                marginBottom: '32px',
              }}
            >
              <h1
                style={{
                  fontSize: '48px',
                  fontWeight: 'bold',
                  color: '#000000',
                  marginBottom: '8px',
                  textAlign: 'center',
                }}
              >
                {nickname}의 매력을 알려주세요
              </h1>
              <p
                style={{
                  fontSize: '18px',
                  color: '#6b7280',
                  textAlign: 'center',
                }}
              >
                익명으로 긍정적인 피드백을 남겨주세요
              </p>
            </div>

            {/* 카드 컨테이너 - teal-50 배경 */}
            <div
              style={{
                backgroundColor: '#f0fdfa', // teal-50
                borderRadius: '16px',
                padding: '24px',
                width: '100%',
                border: '2px solid #99f6e4', // teal-200
              }}
            >
              {/* 진행 바 */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '14px',
                  color: '#6b7280',
                  marginBottom: '12px',
                }}
              >
                <span>질문 1 / 5</span>
                <span>20%</span>
              </div>
              <div
                style={{
                  width: '100%',
                  height: '8px',
                  backgroundColor: '#e5e7eb',
                  borderRadius: '4px',
                  marginBottom: '32px',
                }}
              >
                <div
                  style={{
                    width: '20%',
                    height: '100%',
                    backgroundColor: '#14b8a6', // teal-500
                    borderRadius: '4px',
                  }}
                />
              </div>

              {/* 질문 카드 - 흰색 배경 */}
              <div
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '12px',
                  padding: '24px',
                  border: '2px solid #99f6e4',
                }}
              >
                {/* 질문 텍스트 */}
                <h2
                  style={{
                    fontSize: '28px',
                    fontWeight: 'bold',
                    color: '#000000',
                    marginBottom: '24px',
                  }}
                >
                  당신이 생각하는 {nickname}님은 어떤 분인가요?
                </h2>

                {/* 선택지 버튼들 */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                  }}
                >
                  {['따뜻하고 배려심 깊은 분', '밝고 긍정적인 에너지의 분', '신뢰할 수 있고 든든한 분'].map((option, index) => (
                    <div
                      key={index}
                      style={{
                        width: '100%',
                        padding: '16px',
                        borderRadius: '8px',
                        border: '2px solid #e5e7eb',
                        backgroundColor: index === 0 ? '#f0fdfa' : '#ffffff',
                        borderColor: index === 0 ? '#14b8a6' : '#e5e7eb',
                        color: index === 0 ? '#0f766e' : '#111827',
                        fontWeight: index === 0 ? '600' : '400',
                        fontSize: '18px',
                      }}
                    >
                      {option}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 하단 브랜딩 */}
            <div
              style={{
                marginTop: '24px',
                fontSize: '24px',
                fontWeight: 'bold',
                background: 'linear-gradient(to right, #ec4899, #a855f7, #6366f1)',
                backgroundClip: 'text',
                color: 'transparent',
              }}
            >
              Prism
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

