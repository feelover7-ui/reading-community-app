import { isSupabaseConfigured, supabase } from './supabaseClient'

function fromRow(row) {
  return {
    id: row.id,
    title: row.title,
    author: row.author,
    status: row.status,
    progress: row.progress,
    source: row.source,
    coverUrl: row.cover_url,
    openLibraryKey: row.open_library_key,
    firstPublishYear: row.first_publish_year,
    isbn: row.isbn,
  }
}

function toRow(book) {
  return {
    id: book.id,
    title: book.title,
    author: book.author,
    status: book.status,
    progress: book.progress,
    source: book.source ?? 'manual',
    cover_url: book.coverUrl ?? null,
    open_library_key: book.openLibraryKey ?? null,
    first_publish_year: typeof book.firstPublishYear === 'number' ? book.firstPublishYear : null,
    isbn: book.isbn ?? null,
    updated_at: new Date().toISOString(),
  }
}

export async function fetchBooksFromSupabase() {
  if (!isSupabaseConfigured) {
    return []
  }

  const { data, error } = await supabase.from('books').select('*').order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return data.map(fromRow)
}

export async function saveBookToSupabase(book) {
  if (!isSupabaseConfigured) {
    return
  }

  const { error } = await supabase.from('books').upsert(toRow(book), { onConflict: 'id' })

  if (error) {
    throw error
  }
}

export async function deleteBookFromSupabase(id) {
  if (!isSupabaseConfigured) {
    return
  }

  const { error } = await supabase.from('books').delete().eq('id', id)

  if (error) {
    throw error
  }
}
