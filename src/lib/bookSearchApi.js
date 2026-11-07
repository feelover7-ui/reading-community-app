const OPEN_LIBRARY_SEARCH_URL = 'https://openlibrary.org/search.json'

function getFirstValue(value, fallback = '') {
  return Array.isArray(value) && value.length > 0 ? value[0] : fallback
}

export async function searchBooks(query, { signal } = {}) {
  const keyword = query.trim()
  if (!keyword) return []
  const controller = new AbortController()
  const onAbort = () => controller.abort()
  if (signal?.aborted) controller.abort()
  signal?.addEventListener('abort', onAbort, { once: true })
  const timer = setTimeout(() => controller.abort(), 15000)
  try {
    const url = `${OPEN_LIBRARY_SEARCH_URL}?q=${encodeURIComponent(keyword)}&limit=10`
    const response = await fetch(url, { signal: controller.signal })
    if (!response.ok) throw new Error('도서 검색에 실패했습니다.')
    const data = await response.json()
    if (!Array.isArray(data.docs)) throw new Error('도서 검색 응답을 읽을 수 없습니다.')
    const label = (value, fallback) => typeof value === 'string' && value ? value : fallback
    return data.docs.filter((book) => book && typeof book.key === 'string').slice(0, 10).map((book) => ({
      key: book.key,
      title: label(book.title, '제목 없음').slice(0, 200),
      author: label(getFirstValue(book.author_name), '저자 미상').slice(0, 120),
      firstPublishYear: Number.isFinite(book.first_publish_year) ? book.first_publish_year : '정보 없음',
      isbn: label(getFirstValue(book.isbn), '정보 없음').slice(0, 32),
      coverId: Number.isSafeInteger(book.cover_i) && book.cover_i > 0 ? book.cover_i : null,
    }))
  } catch (error) {
    if (controller.signal.aborted && !signal?.aborted) throw new Error('검색 시간이 초과되었습니다. 다시 검색해 주세요.')
    throw error
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', onAbort)
  }
}
