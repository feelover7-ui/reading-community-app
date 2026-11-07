const PREFIX = 'reading-community-outbox-v1:'
const keyFor = (id) => PREFIX + encodeURIComponent(id)

function validOperation(op) {
  if (!op || typeof op.id !== 'string' || !op.id) return false
  if (op.kind === 'delete') return true
  return op.kind === 'save' && op.book && op.book.id === op.id &&
    typeof op.book.title === 'string' && typeof op.book.author === 'string' &&
    ['reading', 'done'].includes(op.book.status) && Number.isFinite(op.book.progress)
}

export function loadOutbox() {
  const operations = new Map()
  try {
    // 행별 키를 사용해 서로 다른 탭이 다른 책의 대기 목록을 덮지 않게 한다.
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key?.startsWith(PREFIX)) continue
      try {
        const op = JSON.parse(localStorage.getItem(key))
        if (validOperation(op) && key === keyFor(op.id)) operations.set(op.id, op)
      } catch { /* 손상된 항목만 건너뛴다. */ }
    }
  } catch { /* 저장소 접근이 막혀 있으면 빈 대기 목록으로 시작한다. */ }
  return operations
}

export function saveOutbox(operation) {
  try {
    localStorage.setItem(keyFor(operation.id), JSON.stringify(operation))
    return true
  } catch {
    return false
  }
}

export function removeOutbox(operation) {
  try {
    const key = keyFor(operation.id)
    // 다른 탭이 같은 책에 더 새 작업을 썼으면 그 작업은 지우지 않는다.
    if (localStorage.getItem(key) === JSON.stringify(operation)) localStorage.removeItem(key)
    return true
  } catch {
    return false
  }
}

export function applyOutbox(books, operations) {
  const result = new Map(books.map((book) => [book.id, book]))
  for (const op of operations.values()) {
    if (op.kind === 'delete') result.delete(op.id)
    else result.set(op.id, op.book)
  }
  return [...result.values()]
}
