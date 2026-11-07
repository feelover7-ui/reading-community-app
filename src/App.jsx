import { useEffect, useMemo, useRef, useState } from 'react'
import { deleteBookFromSupabase, fetchBooksFromSupabase, saveBookToSupabase } from './lib/booksApi'
import { searchBooks } from './lib/bookSearchApi'
import { isSupabaseConfigured } from './lib/supabaseClient'

const STORAGE_KEY = 'reading-community-books'

const sampleBooks = [
  {
    id: 'sample-1',
    title: '아몬드',
    author: '손원평',
    status: 'reading',
    progress: 42,
  },
  {
    id: 'sample-2',
    title: '불편한 편의점',
    author: '김호연',
    status: 'reading',
    progress: 68,
  },
  {
    id: 'sample-3',
    title: '역행자',
    author: '자청',
    status: 'reading',
    progress: 25,
  },
  {
    id: 'sample-4',
    title: '달러구트 꿈 백화점',
    author: '이미예',
    status: 'done',
    progress: 100,
  },
  {
    id: 'sample-5',
    title: '작별인사',
    author: '김영하',
    status: 'done',
    progress: 100,
  },
]

function normalizeBooks(value) {
  if (!Array.isArray(value)) return sampleBooks
  const seen = new Set()
  return value.filter((book) => {
    if (!book || typeof book.id !== 'string' || !book.id || seen.has(book.id) ||
        typeof book.title !== 'string' || typeof book.author !== 'string') return false
    seen.add(book.id)
    return true
  }).map((book) => ({
    ...book,
    title: book.title.slice(0, 200),
    author: book.author.slice(0, 120),
    status: book.status === 'done' ? 'done' : 'reading',
    progress: book.status === 'done' ? 100 : clampProgress(book.progress),
  }))
}

function loadBooks() {
  try {
    const savedBooks = localStorage.getItem(STORAGE_KEY)
    return savedBooks ? normalizeBooks(JSON.parse(savedBooks)) : sampleBooks
  } catch {
    return sampleBooks
  }
}

function saveBooks(books) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(books))
    return true
  } catch {
    return false
  }
}

const newBookId = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`

function clampProgress(value) {
  return Math.min(100, Math.max(0, Number(value) || 0))
}

function BookCard({ book, onDelete }) {
  return (
    <article className="book-card">
      <div className="book-card__top">
        <div>
          <h3>{book.title}</h3>
          <p>{book.author}</p>
        </div>
        <button type="button" className="delete-button" aria-label={`${book.title} 삭제`} onClick={() => onDelete(book.id)}>
          삭제
        </button>
      </div>
      <div className="progress-row">
        <span>{book.progress}%</span>
        <div className="progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={book.progress} aria-label={`${book.title} 진행률`}>
          <div className="progress-fill" style={{ width: `${book.progress}%` }} />
        </div>
      </div>
    </article>
  )
}

function BookSection({ title, books, emptyText, onDelete }) {
  return (
    <section className="book-section">
      <div className="section-title">
        <h2>{title}</h2>
        <span>{books.length}권</span>
      </div>
      <div className="book-list">
        {books.length === 0 ? (
          <p className="empty-text">{emptyText}</p>
        ) : (
          books.map((book) => <BookCard key={book.id} book={book} onDelete={onDelete} />)
        )}
      </div>
    </section>
  )
}

function SearchResultCard({ book, onAdd }) {
  const coverUrl = book.coverId ? `https://covers.openlibrary.org/b/id/${book.coverId}-M.jpg` : null

  return (
    <article className="result-card">
      <div className="cover-box">
        {coverUrl ? <img src={coverUrl} alt={`${book.title} 표지`} loading="lazy" onError={(event) => { event.currentTarget.hidden = true }} /> : <span>표지 없음</span>}
      </div>
      <div className="result-card__body">
        <h3>{book.title}</h3>
        <dl>
          <div>
            <dt>저자</dt>
            <dd>{book.author}</dd>
          </div>
          <div>
            <dt>첫 출간</dt>
            <dd>{book.firstPublishYear}</dd>
          </div>
          <div>
            <dt>ISBN</dt>
            <dd>{book.isbn}</dd>
          </div>
        </dl>
        <button type="button" className="secondary-button" onClick={() => onAdd(book)}>
          내 서재에 추가
        </button>
      </div>
    </article>
  )
}

export default function App() {
  const [books, setBooks] = useState(loadBooks)
  const booksRef = useRef(books)
  const localRevision = useRef(0)
  const bookWrites = useRef(new Map())
  const searchRequest = useRef({ id: 0, controller: null })
  const [storageError, setStorageError] = useState('')
  const [syncStatus, setSyncStatus] = useState(isSupabaseConfigured ? 'Supabase 연결 확인 중' : 'localStorage 저장 중')
  const [query, setQuery] = useState('')
  const [libraryQuery, setLibraryQuery] = useState('')
  const [libraryResults, setLibraryResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [hasSearched, setHasSearched] = useState(false)
  const [form, setForm] = useState({
    title: '',
    author: '',
    status: 'reading',
    progress: 10,
  })

  const filteredBooks = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) {
      return books
    }

    return books.filter((book) => {
      return `${book.title} ${book.author}`.toLowerCase().includes(normalizedQuery)
    })
  }, [books, query])

  const readingBooks = filteredBooks.filter((book) => book.status === 'reading')
  const doneBooks = filteredBooks.filter((book) => book.status === 'done')
  const averageProgress =
    books.length === 0 ? 0 : Math.round(books.reduce((sum, book) => sum + book.progress, 0) / books.length)

  useEffect(() => {
    let ignore = false
    const revision = localRevision.current

    async function loadRemoteBooks() {
      if (!isSupabaseConfigured) {
        return
      }

      try {
        const remoteBooks = await fetchBooksFromSupabase()
        if (ignore) {
          return
        }

        if (localRevision.current !== revision) {
          setSyncStatus('현재 기록을 유지했습니다. 새로고침하면 서버 기록을 다시 확인합니다.')
          return
        }
        if (remoteBooks.length > 0) {
          const normalized = normalizeBooks(remoteBooks)
          booksRef.current = normalized
          setBooks(normalized)
          if (!saveBooks(normalized)) setStorageError('이 브라우저에 저장할 수 없습니다. 새로고침 전에 기록을 확인해 주세요.')
        }
        setSyncStatus(remoteBooks.length ? '서버 기록 불러오기 완료' : '서버에 책이 없어 이 브라우저 기록을 표시합니다.')
      } catch {
        if (!ignore) {
          setSyncStatus('Supabase 연결 실패, localStorage 사용 중')
        }
      }
    }

    loadRemoteBooks()

    return () => {
      ignore = true
    }
  }, [])

  useEffect(() => () => {
    searchRequest.current.controller?.abort()
  }, [])

  function updateBooks(change) {
    const nextBooks = change(booksRef.current)
    localRevision.current++
    booksRef.current = nextBooks
    setBooks(nextBooks)
    setStorageError(saveBooks(nextBooks) ? '' : '이 브라우저에 저장할 수 없습니다. 새로고침하면 변경 사항이 사라질 수 있습니다.')
  }

  function queueBookWrite(id, operation) {
    const previous = bookWrites.current.get(id) || Promise.resolve()
    const next = previous.catch(() => {}).then(operation)
    bookWrites.current.set(id, next)
    const cleanup = () => {
      if (bookWrites.current.get(id) === next) bookWrites.current.delete(id)
    }
    next.then(cleanup, cleanup)
    return next
  }

  async function addBook(nextBook) {
    updateBooks((current) => [nextBook, ...current])

    try {
      await queueBookWrite(nextBook.id, () => saveBookToSupabase(nextBook))
      if (isSupabaseConfigured) {
        setSyncStatus('이 책을 서버에 저장했습니다.')
      }
    } catch {
      setSyncStatus('서버 저장에 실패했습니다. 브라우저 저장 상태도 확인해 주세요.')
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const title = form.title.trim()
    const author = form.author.trim()

    if (!title || !author) {
      return
    }

    const progress = form.status === 'done' ? 100 : clampProgress(form.progress)
    const nextBook = {
      id: `book-${newBookId()}`,
      title,
      author,
      status: form.status,
      progress,
      source: 'manual',
    }

    void addBook(nextBook)
    setForm({
      title: '',
      author: '',
      status: 'reading',
      progress: 10,
    })
  }

  async function deleteBook(id) {
    updateBooks((current) => current.filter((book) => book.id !== id))

    try {
      await queueBookWrite(id, () => deleteBookFromSupabase(id))
      if (isSupabaseConfigured) {
        setSyncStatus('이 책을 서버에서 삭제했습니다.')
      }
    } catch {
      setSyncStatus('서버 삭제에 실패했습니다. 새로고침하면 책이 다시 보일 수 있습니다.')
    }
  }

  async function handleLibrarySearch(event) {
    event.preventDefault()
    const keyword = libraryQuery.trim()
    const requestId = ++searchRequest.current.id
    searchRequest.current.controller?.abort()
    const controller = new AbortController()
    searchRequest.current.controller = controller

    if (!keyword) {
      setIsSearching(false)
      setHasSearched(false)
      setLibraryResults([])
      setSearchError('')
      return
    }

    setIsSearching(true)
    setSearchError('')
    setHasSearched(true)

    try {
      const results = await searchBooks(keyword, { signal: controller.signal })
      if (requestId !== searchRequest.current.id) return
      setLibraryResults(results)
    } catch (error) {
      if (requestId !== searchRequest.current.id || controller.signal.aborted) return
      setLibraryResults([])
      setSearchError(error.message || '검색 중 오류가 발생했습니다.')
    } finally {
      if (requestId === searchRequest.current.id) setIsSearching(false)
    }
  }

  async function addLibraryBook(book) {
    if (booksRef.current.some((entry) => entry.openLibraryKey === book.key)) {
      setSyncStatus('이미 서재에 추가한 책입니다.')
      return
    }
    const nextBook = {
      id: `open-library-${newBookId()}`,
      title: book.title,
      author: book.author,
      status: 'reading',
      progress: 0,
      source: 'open-library',
      coverUrl: book.coverId ? `https://covers.openlibrary.org/b/id/${book.coverId}-M.jpg` : null,
      openLibraryKey: book.key,
      firstPublishYear: typeof book.firstPublishYear === 'number' ? book.firstPublishYear : null,
      isbn: book.isbn === '정보 없음' ? null : book.isbn,
    }

    await addBook(nextBook)
  }

  return (
    <main className="app-shell">
      <header className="hero">
        <p className="eyebrow">함께 읽고 기록하는 작은 서재</p>
        <h1>독서 커뮤니티</h1>
        <p className="hero-copy">읽는 중인 책과 완독한 책을 나누어 관리하고, 새로고침 후에도 기록을 유지합니다.</p>
        <p className="sync-status" role="status">{syncStatus}</p>
        {storageError ? <p className="status-text status-text--error" role="alert">{storageError}</p> : null}
        <div className="stats">
          <div>
            <strong>{books.length}</strong>
            <span>전체 책</span>
          </div>
          <div>
            <strong>{books.filter((book) => book.status === 'reading').length}</strong>
            <span>읽는 중</span>
          </div>
          <div>
            <strong>{averageProgress}%</strong>
            <span>평균 진행률</span>
          </div>
        </div>
      </header>

      <section className="controls">
        <label className="search-box">
          <span>책 제목/저자 검색</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="예: 김영하, 아몬드"
          />
        </label>

        <form className="add-form" onSubmit={handleSubmit}>
          <h2>책 직접 추가</h2>
          <label>
            <span>책 제목</span>
            <input
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              required
              maxLength={200}
              placeholder="읽고 싶은 책"
            />
          </label>
          <label>
            <span>저자</span>
            <input
              value={form.author}
              onChange={(event) => setForm({ ...form, author: event.target.value })}
              required
              maxLength={120}
              placeholder="저자 이름"
            />
          </label>
          <div className="form-grid">
            <label>
              <span>상태</span>
              <select
                value={form.status}
                onChange={(event) => {
                  const status = event.target.value
                  setForm({
                    ...form,
                    status,
                    progress: status === 'done' ? 100 : Math.min(form.progress, 99),
                  })
                }}
              >
                <option value="reading">읽는 중</option>
                <option value="done">완독</option>
              </select>
            </label>
            <label>
              <span>진행률</span>
              <input
                type="number"
                min="0"
                max="100"
                value={form.status === 'done' ? 100 : form.progress}
                disabled={form.status === 'done'}
                onChange={(event) => setForm({ ...form, progress: Number(event.target.value) })}
              />
            </label>
          </div>
          <button type="submit" className="primary-button">
            추가하기
          </button>
        </form>
      </section>

      <section className="library-search">
        <div className="section-title">
          <h2>도서 검색</h2>
          <span>Open Library</span>
        </div>
        <form className="library-search__form" onSubmit={handleLibrarySearch}>
          <label>
            <span>검색어</span>
            <input
              value={libraryQuery}
              onChange={(event) => setLibraryQuery(event.target.value)}
              placeholder="책 제목이나 저자를 입력하세요"
            />
          </label>
          <button type="submit" className="primary-button" disabled={isSearching}>
            {isSearching ? '검색 중...' : '검색'}
          </button>
        </form>

        {searchError ? <p className="status-text status-text--error" role="alert">{searchError}</p> : null}
        {isSearching ? <p className="status-text">도서를 검색하고 있습니다.</p> : null}
        {!isSearching && hasSearched && !searchError && libraryResults.length === 0 ? (
          <p className="status-text">검색 결과가 없습니다.</p>
        ) : null}

        {libraryResults.length > 0 ? (
          <div className="result-list">
            {libraryResults.map((book) => (
              <SearchResultCard key={book.key} book={book} onAdd={addLibraryBook} />
            ))}
          </div>
        ) : null}
      </section>

      <div className="sections">
        <BookSection title="읽는 중 책 목록" books={readingBooks} emptyText="읽는 중인 책이 없습니다." onDelete={deleteBook} />
        <BookSection title="완독 책 목록" books={doneBooks} emptyText="완독한 책이 없습니다." onDelete={deleteBook} />
      </div>
    </main>
  )
}
