// 기존 도량 주소/법당 출구는 원본 외부 맵으로 이어진다.
const from = new URLSearchParams(location.search).get('from')
location.replace('/deungbul.html?from=' + (from === 'beopdang' ? 'beopdang' : 'doryang'))
