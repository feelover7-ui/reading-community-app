/* 한마음선원 안양본원 도량 배치.

   근거 두 가지를 나눠 씁니다.

   (1) 카카오 스카이뷰(2026-11-09, 국토지리정보원 항공영상)에서 직접 읽은 것
       기준점: 카카오 장소검색 `한마음선원 안양본원` 중심 37.4216180, 126.9085209
       (도로명 경기 안양시 만안구 경수대로 1282 · 지번 석수동 101-60)
       레벨 1 에서 20m 격자를 띄워 읽었고 그때 배율이 1m = 7.93px 였습니다.
       본관의 기와지붕 네 귀퉁이를 읽어 약 27m × 39m, 정북에서 시계방향 49도 돌아
       앉은 것을 확인했습니다. 도량 전체가 경수대로를 따라 같은 각도로 앉아 있습니다.

   (2) 공식 `선원 안내도`(조감도) 범례에서 가져온 것
       건물 이름과 층별 용도, 그리고 서로의 앞뒤·좌우 관계입니다.

   그래서 **본관의 크기·방향과 도량의 전체 크기는 위성에서 잰 값**이고,
   **나머지 건물의 자리는 조감도의 배치를 그 축에 맞춰 옮긴 것**입니다.
   사선 조감도는 거리가 왜곡돼 있어 두 자료를 그대로 겹칠 수 없습니다.
   실측 지도가 아니고 걸어 다니기 위한 게임용 배치입니다.

   타일 한 칸은 약 2m 로 잡았습니다. 도량 영역은 x 1~48, y 26~68 입니다.
   구정탑(22,41)과 동상(8,32), 법당(32,34)은 기존 좌표를 그대로 둡니다.
   탑돌이와 법당 문이 그 값에 걸려 있습니다. */

export const SITE_SOURCE = Object.freeze({
  satellite: '카카오 스카이뷰 (국토지리정보원 항공영상) 2026-11-09 판독',
  anchor: { lat: 37.4216180, lon: 126.9085209 },
  scale: '레벨 1 에서 1m = 7.93px, 20m 격자',
  hallMeasured: { widthM: 27, depthM: 39, bearingDeg: 49 },
  guide: '공식 선원 안내도(조감도) 범례',
  caution: '실측 좌표가 아닙니다. 본관 외 건물 자리는 조감도 배치를 옮긴 것입니다.'
})

/* 조감도 범례 번호를 그대로 답니다. 들어갈 수 있는 곳은 법당 하나뿐입니다. */
export const SITE_BUILDINGS = Object.freeze([
  { id: 'hall', no: 1, name: '법당', full: '본관', x: 32, z: 34, w: 14, d: 13,
    kind: 'hanok', floors: 5, enter: true,
    desc: '5층 대법당과 방송실, 2·3·4층 강당, 1층 종무소와 무진향, 지하 1층 후원, 지하 2~4층 주차장입니다. 공식 안내도의 이름은 본관이고 화면 이름은 법당입니다.' },
  { id: 'byeolgwan', no: 2, name: '별관', x: 28, z: 27, w: 10, d: 5,
    kind: 'modern', floors: 4, roof: '#8f9aa6',
    desc: '3층 국제회의실, 2층 한마음과학원·국제문화원, 1층 출판부입니다.' },
  { id: 'wondang', no: 3, name: '원당', x: 17, z: 27, w: 9, d: 5,
    kind: 'hanok', floors: 2, roof: '#4a5560',
    desc: '2층 선실, 1층 사보편찬실입니다. 조감도에서 기와지붕을 얹은 집입니다.' },
  { id: 'simjugwan', no: 4, name: '심주관', x: 2, z: 43, w: 10, d: 6,
    kind: 'modern', floors: 2, roof: '#9a8f80',
    desc: '1·2층 소법회실입니다. 조감도에서 마당 왼편에 길게 누운 돌벽 건물입니다.' },
  { id: 'children', no: 5, name: '어린이법당', x: 3, z: 51, w: 7, d: 5,
    kind: 'modern', floors: 1, roof: '#7fa9c9',
    desc: '연못 곁 낮은 집입니다.' },
  { id: 'jaryogwan', no: 9, name: '자료관', x: 40, z: 27, w: 8, d: 6,
    kind: 'modern', floors: 5, roof: '#a8766a',
    desc: '도량 안쪽 끝의 높은 집입니다.' },
  { id: 'yosachae', no: 10, name: '요사채', x: 39, z: 49, w: 8, d: 5,
    kind: 'modern', floors: 3, roof: '#8a7a66',
    desc: '법당 뒤편 생활 공간입니다.' },
  { id: 'jongmuso', no: 11, name: '측문·종무소', x: 27, z: 50, w: 5, d: 4,
    kind: 'modern', floors: 1, roof: '#9a8f80',
    desc: '옆문 쪽 종무소입니다.' },
  { id: 'research', no: 14, name: '대행선사연구원', x: 43, z: 57, w: 5, d: 5,
    kind: 'modern', floors: 3, roof: '#8f9aa6',
    desc: '도량 바깥쪽 끝에 있습니다.' }
])

/* 건물이 아닌 것들. 연못만 막고 나머지는 바닥 표시입니다. */
export const SITE_POND = Object.freeze({ x: 14, z: 49, w: 7, d: 5 })
export const SITE_MARKS = Object.freeze([
  { id: 'parkIn', no: 12, name: '주차장 입구', x: 20, z: 66 },
  { id: 'parkOut', no: 13, name: '주차장 출구', x: 30, z: 66 }
])

export const ENTERABLE = Object.freeze(SITE_BUILDINGS.filter(b => b.enter).map(b => b.id))
