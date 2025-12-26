import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-700 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Catalyst</h1>
          <p className="text-lg text-gray-600 mb-8">Investor Dashboard</p>
          
          <div className="space-y-4">
            <Link
              href="/login"
              className="block w-full py-3 px-6 text-center rounded-lg
                         bg-indigo-600 text-white font-semibold text-lg
                         hover:bg-indigo-700 transition-colors duration-200
                         shadow-lg hover:shadow-xl"
            >
              Login
            </Link>
            
            <Link
              href="/register"
              className="block w-full py-3 px-6 text-center rounded-lg
                         bg-white text-indigo-600 font-semibold text-lg
                         border-2 border-indigo-600
                         hover:bg-indigo-50 transition-colors duration-200"
            >
              Register as Investor
            </Link>
          </div>
          
          <p className="mt-8 text-sm text-gray-500">
            Fund SMEs and earn profit-share returns
          </p>
        </div>
      </div>
    </div>
  );
}
