// 공식 조감도 one_tour_01.jpg를 2026-11-08 직접 확인한 뒤 상대 배치를 교정했습니다.
// 아래 좌표는 게임용 축척이며 GPS·실측 좌표나 실제 출입 가능 구역이 아닙니다.
const base='https://hanmaum.org/content/'
const overview=base+'one_tour_01?me_code=1070000000'
export const places=[
 {id:'hall',number:1,name:'본관 · 대법당',category:'앞쪽 오른편의 본관',x:69,y:65,arrival:[66,85],
  description:'공식 조감도에서 앞쪽 오른편의 큰 건물이 본관입니다. 대법당은 본관 5층에 있으며, 칠보탑은 지붕 위에 세워져 있습니다.',
  note:'실내와 층별 이동은 아직 구현하지 않았습니다. 창과 지붕은 조감도에서 확인한 특징을 간략화했습니다.',
  source:base+'one_tour_02?me_code=1070300000'},
 {id:'annex',number:2,name:'별관',category:'본관 뒤쪽의 건물',x:82,y:23,arrival:[70,36],
  description:'조감도에서 본관 뒤쪽에 별관으로 표시된 건물을 반영했습니다. 본관과 다른 현대식 건물 형태로 구분합니다.',
  note:'실내 용도와 실제 통행 가능 구역은 별도 확인이 필요합니다.',source:overview},
 {id:'simju',number:4,name:'심주관',category:'왼편의 단차 있는 건물',x:25,y:53,arrival:[34,69],
  description:'왼편 건물군의 단차와 계단 관계를 조감도에 맞춰 다시 구성했습니다. 공식 설명에서 심주석은 심주관 1·2층을 관통하는 기둥으로 소개됩니다.',
  note:'심주석은 실내 공간입니다. 야외의 독립된 돌기둥처럼 표시하지 않습니다.',
  source:base+'one_tour_08?me_code=1070900000'},
 {id:'nine',number:6,name:'구정탑 · 도량탑',category:'중앙 마당의 탑',x:54,y:40,arrival:[59,36],
  description:'아홉 개의 둥근 구로 이루어진 구정탑을 중앙의 단차 있는 마당 쪽에 배치했습니다. 본관 지붕 위 칠보탑과 구분합니다.',
  note:'탑의 크기는 본관과의 관계를 고려해 줄였으며, 실측 비율은 아닙니다.',
  source:base+'one_tour_07?me_code=1070800000'},
 {id:'seven',number:7,name:'칠보탑 · 우주탑',category:'본관 지붕 위',x:65,y:28,arrival:[66,85],
  description:'칠보탑은 별도의 석탑이 아니라 본관 지붕 위의 일곱 개 황금빛 구입니다. 지도에서 선택하면 지붕 쪽을 살펴보고, 캐릭터는 본관 앞에 머뭅니다.',
  note:'지붕 위로 걷는 장소가 아닙니다.',
  source:base+'one_tour_06?me_code=1070700000'},
 {id:'statue',number:8,name:'대행선사 동상',category:'왼편 위쪽 동상 공간',x:24,y:20,arrival:[24,31],
  description:'공식 조감도에서 왼편 위쪽의 동상 공간을 반영했습니다. 동상 주변의 화엄석과 연화좌대를 간략한 형태로 표현합니다.',
  note:'동상의 세부 형상은 상징적으로 단순화했습니다. 실제 심주석은 심주관 내부에 있습니다.',
  source:base+'one_tour_08?me_code=1070900000'},
 {id:'seosan',number:'안내',name:'서산정 · 부도탑',category:'공식 안내로 살펴보기',onMap:false,
  description:'서산정과 부도탑은 공식 도량 안내에 소개되어 있습니다. 확보한 조감도에서 위치를 확정하지 못했으므로 지도에 임의의 정자나 위치 표식을 그리지 않았습니다.',
  note:'이 항목을 선택해도 지도 속 캐릭터를 이동시키지 않습니다.',
  source:base+'one_tour_09?me_code=1070a00000'},
 {id:'craft',number:'체험',name:'등불사장 작업장',category:'소원등 만들기',x:43,y:76,arrival:[49,86],
  description:'나만의 소원등을 만들고 법우들과 이야기를 나누는 기존 게임으로 이동합니다.',
  note:'탐방 게임을 위해 추가한 작업장입니다. 실제 본원 시설의 위치를 나타내지 않습니다.',
  href:'/deungbul.html'}
]
export const startPosition={x:66,y:90}
export const obstacles=[
 [60,50,20,30], [76,39,12,29], [73,14,17,24],
 [43,16,16,14], [12,43,31,19], [43,40,25,10],
 [18,15,12,12], [52,30,5,8], [90,28,8,20], [36,73,14,11]
]
export function canWalk(x,y){
 return Number.isFinite(x)&&Number.isFinite(y)&&x>=5&&x<=95&&y>=6&&y<=94&&
  !obstacles.some(([left,top,width,height])=>x>left&&x<left+width&&y>top&&y<top+height)
}
