import { useEffect, useMemo, useState } from 'react'

const categories = [
  { key: 'websites', label: 'Websites' },
  { key: 'tools', label: 'Tools' },
  { key: 'apps', label: 'Apps' },
  { key: 'ideas', label: 'Ideas' },
  { key: 'misc', label: 'Misc' },
]

const sorts = [
  { key: 'trending', label: 'Trending' },
  { key: 'most', label: 'Most Voted' },
  { key: 'newest', label: 'Newest' },
]

function useSessionId() {
  const [sid, setSid] = useState('')
  useEffect(() => {
    let s = localStorage.getItem('voting_session_id')
    if (!s) {
      s = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)
      localStorage.setItem('voting_session_id', s)
    }
    setSid(s)
  }, [])
  return sid
}

function App() {
  const baseUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'
  const sessionId = useSessionId()

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [category, setCategory] = useState('')
  const [sort, setSort] = useState('trending')
  const [submitting, setSubmitting] = useState(false)

  const [form, setForm] = useState({
    title: '',
    category: 'websites',
    description: '',
    link: '',
    image: '',
  })

  const fetchItems = async () => {
    try {
      setLoading(true)
      setError('')
      const params = new URLSearchParams()
      if (category) params.set('category', category)
      if (sort) params.set('sort', sort)
      const res = await fetch(`${baseUrl}/api/items?${params.toString()}`)
      if (!res.ok) throw new Error(`Failed to load: ${res.status}`)
      const data = await res.json()
      setItems(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchItems()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, sort])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) return
    setSubmitting(true)
    try {
      const payload = {
        title: form.title.trim(),
        category: form.category,
        description: form.description || undefined,
        link: form.link || undefined,
        image: form.image || undefined,
      }
      const res = await fetch(`${baseUrl}/api/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Failed to create')
      setForm({ title: '', category: form.category, description: '', link: '', image: '' })
      await fetchItems()
    } catch (e) {
      alert(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  const vote = async (itemId, direction) => {
    try {
      const res = await fetch(`${baseUrl}/api/items/${itemId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ direction, session_id: sessionId }),
      })
      if (!res.ok) {
        const txt = await res.text()
        throw new Error(txt || 'Vote failed')
      }
      const updated = await res.json()
      setItems((prev) => prev.map((it) => (it.id === itemId ? updated : it)))
    } catch (e) {
      try {
        const obj = JSON.parse(e.message)
        if (obj.detail) alert(obj.detail)
        else alert('You may have already voted')
      } catch {
        alert('You may have already voted')
      }
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50">
      <header className="sticky top-0 z-10 backdrop-blur bg-white/60 border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold text-slate-800">Votify</h1>
          <div className="flex gap-2">
            <select
              className="border rounded px-3 py-2 bg-white"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.key} value={c.key}>{c.label}</option>
              ))}
            </select>
            <select
              className="border rounded px-3 py-2 bg-white"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              {sorts.map((s) => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </select>
            <a href="/test" className="px-3 py-2 rounded border bg-white hover:bg-slate-50">System</a>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 grid md:grid-cols-3 gap-6">
        <section className="md:col-span-2 space-y-4">
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <form onSubmit={handleSubmit} className="grid sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-sm text-slate-600 mb-1">Title</label>
                <input
                  className="w-full border rounded px-3 py-2"
                  placeholder="e.g. Best JS framework"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Category</label>
                <select
                  className="w-full border rounded px-3 py-2"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                >
                  {categories.map((c) => (
                    <option key={c.key} value={c.key}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Link (optional)</label>
                <input
                  className="w-full border rounded px-3 py-2"
                  placeholder="https://example.com"
                  value={form.link}
                  onChange={(e) => setForm({ ...form, link: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm text-slate-600 mb-1">Image URL (optional)</label>
                <input
                  className="w-full border rounded px-3 py-2"
                  placeholder="https://..."
                  value={form.image}
                  onChange={(e) => setForm({ ...form, image: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm text-slate-600 mb-1">Description (optional)</label>
                <textarea
                  className="w-full border rounded px-3 py-2"
                  rows={3}
                  placeholder="Why should people vote for it?"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2 flex gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold px-4 py-2 rounded"
                >
                  {submitting ? 'Submitting...' : 'Submit Item'}
                </button>
                <button
                  type="button"
                  onClick={fetchItems}
                  className="border px-4 py-2 rounded bg-white hover:bg-slate-50"
                >
                  Refresh
                </button>
              </div>
            </form>
          </div>

          <div className="space-y-3">
            {loading ? (
              <div className="text-slate-600">Loading items...</div>
            ) : error ? (
              <div className="text-red-600">{error}</div>
            ) : items.length === 0 ? (
              <div className="text-slate-600">No items yet. Be the first to submit!</div>
            ) : (
              items.map((it, idx) => (
                <article key={it.id} className="bg-white border rounded-lg p-4 flex gap-4 items-start">
                  <div className="flex flex-col items-center">
                    <button
                      onClick={() => vote(it.id, 'up')}
                      className="w-10 h-10 grid place-items-center rounded border hover:bg-green-50 text-green-700"
                      title="Upvote"
                    >▲</button>
                    <div className="text-center mt-1 text-sm font-semibold">{it.score}</div>
                    <button
                      onClick={() => vote(it.id, 'down')}
                      className="w-10 h-10 grid place-items-center rounded border hover:bg-rose-50 text-rose-700 mt-1"
                      title="Downvote"
                    >▼</button>
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 border">#{idx + 1}</span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border">{it.category}</span>
                      <span>•</span>
                      <span>{new Date(it.created_at || Date.now()).toLocaleString()}</span>
                    </div>
                    <h3 className="text-lg font-semibold text-slate-800 mt-1">{it.title}</h3>
                    {it.description && (
                      <p className="text-slate-600 mt-1">{it.description}</p>
                    )}
                    <div className="flex gap-3 mt-2 text-sm text-slate-600">
                      <span>👍 {it.upvotes}</span>
                      <span>👎 {it.downvotes}</span>
                      {it.link && (
                        <a className="text-indigo-600 hover:underline" href={it.link} target="_blank" rel="noreferrer">Visit link</a>
                      )}
                    </div>
                  </div>

                  {it.image && (
                    <img src={it.image} alt="" className="w-20 h-20 object-cover rounded border" />
                  )}
                </article>
              ))
            )}
          </div>
        </section>

        <aside className="space-y-3">
          <div className="bg-white border rounded-lg p-4">
            <h3 className="font-semibold text-slate-800 mb-2">Filters</h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setCategory('')}
                className={`px-3 py-1.5 rounded border ${category === '' ? 'bg-slate-900 text-white' : 'bg-white hover:bg-slate-50'}`}
              >All</button>
              {categories.map((c) => (
                <button
                  key={c.key}
                  onClick={() => setCategory(c.key)}
                  className={`px-3 py-1.5 rounded border ${category === c.key ? 'bg-slate-900 text-white' : 'bg-white hover:bg-slate-50'}`}
                >{c.label}</button>
              ))}
            </div>
          </div>

          <div className="bg-white border rounded-lg p-4">
            <h3 className="font-semibold text-slate-800 mb-2">Sort</h3>
            <div className="flex flex-wrap gap-2">
              {sorts.map((s) => (
                <button
                  key={s.key}
                  onClick={() => setSort(s.key)}
                  className={`px-3 py-1.5 rounded border ${sort === s.key ? 'bg-indigo-600 text-white' : 'bg-white hover:bg-slate-50'}`}
                >{s.label}</button>
              ))}
            </div>
          </div>

          <Trending baseUrl={baseUrl} />
        </aside>
      </main>

      <footer className="text-center text-slate-500 text-sm py-6">
        Anonymous voting. One vote per device per item.
      </footer>
    </div>
  )
}

function Trending({ baseUrl }) {
  const [data, setData] = useState(null)
  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch(`${baseUrl}/api/stats`)
        if (res.ok) setData(await res.json())
      } catch {}
    })()
  }, [baseUrl])

  return (
    <div className="bg-white border rounded-lg p-4">
      <h3 className="font-semibold text-slate-800 mb-2">Trending Now</h3>
      {!data ? (
        <div className="text-slate-500 text-sm">Loading...</div>
      ) : data.top.length === 0 ? (
        <div className="text-slate-500 text-sm">No trending items yet.</div>
      ) : (
        <ul className="space-y-2">
          {data.top.map((t, i) => (
            <li key={t.id} className="flex items-center gap-2">
              <span className="w-6 text-right font-semibold">{i + 1}.</span>
              <span className="flex-1 truncate">{t.title}</span>
              <span className="text-xs px-2 py-0.5 rounded bg-slate-100 border">{t.score}</span>
            </li>
          ))}
        </ul>
      )}
      {data && (
        <div className="mt-3 text-xs text-slate-500">
          Total items: {data.counts.total_items} • Total votes: {data.counts.total_votes}
        </div>
      )}
    </div>
  )
}

export default App
