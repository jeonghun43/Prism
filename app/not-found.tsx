import Link from 'next/link'
import { AlertCircle } from 'lucide-react'

export default function NotFound() {
  return (
    <main className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-teal-50 rounded-2xl shadow-xl p-8 text-center space-y-6 border-2 border-teal-200">
          <div className="flex justify-center">
            <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center">
              <AlertCircle className="w-12 h-12 text-gray-400" />
            </div>
          </div>
          <div>
            <h1 className="text-6xl font-bold mb-2 text-black">
              404
            </h1>
            <h2 className="text-2xl font-bold text-black mb-4">
              페이지를 찾을 수 없습니다
            </h2>
            <p className="text-gray-600">
              요청하신 페이지가 존재하지 않거나 삭제되었습니다.
            </p>
          </div>
          <Link
            href="/"
            className="inline-block bg-teal-500 text-white py-3 px-8 rounded-lg font-semibold text-lg hover:bg-teal-600 transition-all"
          >
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    </main>
  )
}

