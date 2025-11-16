/**
 * Share utilities for social platforms
 */

export function shareToKakaoTalk(url: string, title: string, description: string) {
  // KakaoTalk sharing requires Kakao SDK
  // For MVP, we'll use the web share API or copy to clipboard
  if (typeof window !== 'undefined' && (window as any).Kakao) {
    ;(window as any).Kakao.Share.sendDefault({
      objectType: 'feed',
      content: {
        title,
        description,
        // 이미지 제거 - 이미지 없이 공유
        link: {
          mobileWebUrl: url,
          webUrl: url,
        },
      },
    })
  } else {
    // Fallback: copy to clipboard
    navigator.clipboard.writeText(url)
    alert('링크가 클립보드에 복사되었습니다. 카카오톡에 붙여넣어 공유하세요!')
  }
}

export function shareToInstagram(url: string) {
  // Instagram doesn't support direct web sharing
  // Users need to copy the link and paste it in Instagram
  navigator.clipboard.writeText(url)
  alert('링크가 클립보드에 복사되었습니다. 인스타그램 스토리에 붙여넣어 공유하세요!')
}

export async function shareLink(url: string, title: string, text: string) {
  if (navigator.share) {
    try {
      await navigator.share({
        title,
        text,
        url,
      })
      return true
    } catch (err) {
      // User cancelled or error
      return false
    }
  }
  return false
}

