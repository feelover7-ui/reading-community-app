const OPEN_LIBRARY_SEARCH_URL = 'https://openlibrary.org/search.json'

function getFirstValue(value, fallback = '') {
  return Array.isArray(value) && value.length > 0 ? value[0] : fallback
}

export async function searchBooks(query) {
  const keyword = query.trim()

  if (!keyword) {
    return []
  }

  const url = `${OPEN_LIBRARY_SEARCH_URL}?q=${encodeURIComponent(keyword)}&limit=10`
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error('도서 검색에 실패했습니다.')
  }

  const data = await response.json()

  return (data.docs ?? []).map((book) => ({
    key: book.key,
    title: book.title ?? '제목 없음',
    author: getFirstValue(book.author_name, '저자 미상'),
    firstPublishYear: book.first_publish_year ?? '정보 없음',
    isbn: getFirstValue(book.isbn, '정보 없음'),
    coverId: book.cover_i ?? null,
  }))
}
