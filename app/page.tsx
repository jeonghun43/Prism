import LinkGenerator from '@/components/LinkGenerator'

export default function Home() {
  return (
    <main className="min-h-screen bg-white flex items-center justify-center p-3 sm:p-4 md:p-6">
      <div className="max-w-md w-full">
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4 text-black">
            Prism
          </h1>
          <p className="text-gray-600 text-base sm:text-lg">
            나만의 매력 스펙트럼을 발견하다
          </p>
        </div>
        <LinkGenerator />
      </div>
    </main>
  )
}

