'use client'

import { useAuth } from './AuthProvider'

export default function Navbar() {
  const { user, signOut } = useAuth()

  if (!user) return null

  return (
    <nav className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="text-2xl">🔖</span>
        <h1 className="text-xl font-bold text-white">Smart Bookmarks</h1>
      </div>
      <div className="flex items-center gap-4">
        {/* show user email on larger screens */}
        <span className="text-gray-400 text-sm hidden sm:block">
          {user.email}
        </span>
        <button
          onClick={signOut}
          className="bg-red-600 hover:bg-red-700 text-white text-sm px-4 py-2 rounded-lg transition-colors cursor-pointer"
        >
          Sign Out
        </button>
      </div>
    </nav>
  )
}
