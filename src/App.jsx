import { useMemo, useState } from 'react'
import { searchBooks } from './lib/bookSearchApi'

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

function loadBooks() {
  try {
    const savedBooks = localStorage.getItem(STORAGE_KEY)
    return savedBooks ? JSON.parse(savedBooks) : sampleBooks
  } catch {
    return sampleBooks
  }
}

function saveBooks(books) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(books))
}

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
        <button type="button" className="delete-button" onClick={() => onDelete(book.id)}>
          삭제
        </button>
      </div>
      <div className="progress-row">
        <span>{book.progress}%</span>
        <div className="progress-track" aria-label={`${book.title} 진행률 ${book.progress}%`}>
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
        {coverUrl ? <img src={coverUrl} alt={`${book.title} 표지`} /> : <span>표지 없음</span>}
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

  function updateBooks(nextBooks) {
    setBooks(nextBooks)
    saveBooks(nextBooks)
  }

  function handleSubmit(event) {
    event.preventDefault()
    const title = form.title.trim()
    const author = form.author.trim()

    if (!title || !author) {
      return
    }

    const progress = form.status === 'done' ? 100 : clampProgress(form.progress)
    const nextBook = {
      id: `book-${Date.now()}`,
      title,
      author,
      status: form.status,
      progress,
    }

    updateBooks([nextBook, ...books])
    setForm({
      title: '',
      author: '',
      status: 'reading',
      progress: 10,
    })
  }

  function deleteBook(id) {
    updateBooks(books.filter((book) => book.id !== id))
  }

  async function handleLibrarySearch(event) {
    event.preventDefault()
    const keyword = libraryQuery.trim()

    if (!keyword) {
      setHasSearched(false)
      setLibraryResults([])
      setSearchError('')
      return
    }

    setIsSearching(true)
    setSearchError('')
    setHasSearched(true)

    try {
      const results = await searchBooks(keyword)
      setLibraryResults(results)
    } catch (error) {
      setLibraryResults([])
      setSearchError(error.message || '검색 중 오류가 발생했습니다.')
    } finally {
      setIsSearching(false)
    }
  }

  function addLibraryBook(book) {
    const nextBook = {
      id: `open-library-${book.key}-${Date.now()}`,
      title: book.title,
      author: book.author,
      status: 'reading',
      progress: 0,
    }

    updateBooks([nextBook, ...books])
  }

  return (
    <main className="app-shell">
      <header className="hero">
        <p className="eyebrow">함께 읽고 기록하는 작은 서재</p>
        <h1>독서 커뮤니티</h1>
        <p className="hero-copy">읽는 중인 책과 완독한 책을 나누어 관리하고, 새로고침 후에도 기록을 유지합니다.</p>
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
              placeholder="읽고 싶은 책"
            />
          </label>
          <label>
            <span>저자</span>
            <input
              value={form.author}
              onChange={(event) => setForm({ ...form, author: event.target.value })}
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

        {searchError ? <p className="status-text status-text--error">{searchError}</p> : null}
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
