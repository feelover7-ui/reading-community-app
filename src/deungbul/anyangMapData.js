// 장소 이름과 설명은 공식 도량 안내를 참고했습니다.
// x/y/arrival과 충돌 사각형은 게임 시안 좌표이며 실제 배치나 GPS가 아닙니다.
const base = 'https://hanmaum.org/content/'
export const places = [
  { id:'hall', number:1, name:'대법당', category:'예불과 마음공부', x:36, y:43, arrival:[50,62],
    description:'안양 본원의 대법당에는 석가모니불을 모시고 있습니다. 법당 안의 단청과 목탱화 등도 공식 도량 안내에서 살펴볼 수 있습니다.',
    note:'이 시안에서는 건물 외부와 안내만 제공합니다. 실내 이동은 아직 구현하지 않았습니다.',
    source:base+'one_tour_02?me_code=1070300000' },
  { id:'seven', number:2, name:'칠보탑 · 우주탑', category:'법당 지붕 위의 상징', x:50, y:17, arrival:[50,62],
    description:'5층 법당 지붕 위의 칠보탑은 일곱 개의 황금빛 구로 이루어져 있습니다. 이 맵에서는 법당 앞에서 그 모습을 살펴봅니다.',
    note:'지붕 위로 이동하는 장소가 아닙니다.',
    source:base+'one_tour_06?me_code=1070700000' },
  { id:'nine', number:3, name:'구정탑 · 도량탑', category:'마당의 탑', x:62, y:72, arrival:[68,82],
    description:'본원 마당에는 아홉 개의 둥근 구로 이루어진 구정탑이 있습니다. 탑의 유래와 의미는 공식 안내에서 확인할 수 있습니다.',
    note:'탑과 주변 길의 크기는 탐방 시안에 맞춰 단순화했습니다.',
    source:base+'one_tour_07?me_code=1070800000' },
  { id:'statue', number:4, name:'대행선사 동상 · 심주석', category:'가르침을 이어가는 자리', x:80, y:50, arrival:[82,63],
    description:'본원에는 대행선사의 동상과 이를 받치는 심주석이 있습니다. 심주석은 심주관 내부에서 볼 수 있는 기둥으로 소개되어 있습니다.',
    note:'그림은 동상 공간을 나타내는 간략한 상징입니다. 실제 동상이나 실내를 재현한 조형이 아닙니다.',
    source:base+'one_tour_08?me_code=1070900000' },
  { id:'seosan', number:5, name:'서산정 · 부도탑', category:'조용히 머무는 공간', x:80, y:20, arrival:[79,35],
    description:'서산정은 대행선사께서 노년에 머무셨던 한식 목조 건물입니다. 공식 안내에서는 부도탑도 함께 소개하고 있습니다.',
    note:'주변 공간과 다른 건물 사이의 거리·방향은 아직 확인하지 않았습니다.',
    source:base+'one_tour_09?me_code=1070a00000' },
  { id:'craft', number:6, name:'등불사장', category:'소원등 만들기 체험', x:21, y:66, arrival:[25,79],
    description:'골조를 엮고 한지를 바른 뒤 나만의 소원을 담아 보세요. 기존 등불사장에서 법우들과 소원등과 이야기를 나눌 수 있습니다.',
    note:'게임에 연결한 체험 공간입니다. 실제 도량 내 등불사장의 위치를 표시한 것은 아닙니다.',
    href:'/deungbul.html' }
]
export const obstacles = [
  [34,34,32,23], [59,56,6,22], [74,40,15,17], [70,14,20,18], [13,58,19,15]
]
export function canWalk(x,y) {
  return Number.isFinite(x) && Number.isFinite(y) && x>=5 && x<=95 && y>=6 && y<=94 &&
    !obstacles.some(([left,top,width,height])=>x>left&&x<left+width&&y>top&&y<top+height)
}
