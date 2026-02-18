'use client'

import { useAuth } from '@/components/AuthProvider'
import Navbar from '@/components/Navbar'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function HomePage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [bookmarks, setBookmarks] = useState([])
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [adding, setAdding] = useState(false)

  // redirect to login if not authed
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  // helper to fetch bookmarks from supabase
  const fetchBookmarks = async () => {
    if (!user) return
    const { data, error } = await supabase
      .from('bookmarks')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching bookmarks:', error.message)
    } else {
      setBookmarks(data)
    }
  }

  // fetch bookmarks when user logs in
  useEffect(() => {
    if (!user) return
    fetchBookmarks()
  }, [user])

  // realtime subscription for instant sync accross tabs
  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel(`bookmarks-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookmarks',
        },
        (payload) => {
          if (payload.eventType === 'INSERT' && payload.new.user_id === user.id) {
            setBookmarks((prev) => {
              if (prev.some((b) => b.id === payload.new.id)) return prev
              return [payload.new, ...prev]
            })
          }

          if (payload.eventType === 'DELETE') {
            setBookmarks((prev) => prev.filter((b) => b.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    // also refetch when user switches back to this tab (backup for realtime)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchBookmarks()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      supabase.removeChannel(channel)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [user])

  // handle adding new bookmark
  const handleAddBookmark = async (e) => {
    e.preventDefault()
    if (!title.trim() || !url.trim()) return

    setAdding(true)

    // add https if user didnt include it
    let finalUrl = url.trim()
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      finalUrl = 'https://' + finalUrl
    }

    const { data, error } = await supabase
      .from('bookmarks')
      .insert([{ title: title.trim(), url: finalUrl, user_id: user.id }])
      .select()

    if (error) {
      console.error('Error adding bookmark:', error.message)
      alert('Error adding bookmark: ' + error.message)
    } else if (data) {
      setBookmarks((prev) => [data[0], ...prev])
      // clear the form
      setTitle('')
      setUrl('')
    }

    setAdding(false)
  }

  // handle deleting a bookmark
  const handleDeleteBookmark = async (id) => {
    const { error } = await supabase
      .from('bookmarks')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting bookmark:', error.message)
      alert('Error deleting bookmark: ' + error.message)
    } else {
      // remove from local state imediately
      setBookmarks((prev) => prev.filter((b) => b.id !== id))
    }
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-400 text-lg">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar />

      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* add bookmark form */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">Add a Bookmark</h2>
          <form onSubmit={handleAddBookmark} className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm text-gray-400 mb-1">
                Title
              </label>
              <input
                id="title"
                type="text"
                placeholder="e.g. My Favorite Blog"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label htmlFor="url" className="block text-sm text-gray-400 mb-1">
                URL
              </label>
              <input
                id="url"
                type="text"
                placeholder="e.g. https://example.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <button
              type="submit"
              disabled={adding}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg transition-colors cursor-pointer"
            >
              {adding ? 'Adding...' : 'Add Bookmark'}
            </button>
          </form>
        </div>

        {/* bookmarks list */}
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">
            Your Bookmarks{' '}
            <span className="text-gray-500 font-normal">({bookmarks.length})</span>
          </h2>

          {bookmarks.length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
              <span className="text-4xl block mb-3">📭</span>
              <p className="text-gray-400">No bookmarks yet. Add one above!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {bookmarks.map((bookmark) => (
                <div
                  key={bookmark.id}
                  className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center justify-between gap-4 hover:border-gray-700 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <h3 className="text-white font-medium truncate">
                      {bookmark.title}
                    </h3>
                    <a
                      href={bookmark.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 text-sm truncate block"
                    >
                      {bookmark.url}
                    </a>
                  </div>
                  <button
                    onClick={() => handleDeleteBookmark(bookmark.id)}
                    className="text-red-400 hover:text-red-300 hover:bg-red-900/30 p-2 rounded-lg transition-colors flex-shrink-0 cursor-pointer"
                    title="Delete bookmark"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
