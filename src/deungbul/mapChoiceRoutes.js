/* 들어가는 길. 사용자 요청으로 맵 선택 화면을 없애고 예전처럼 한 곳으로 들어갑니다.
   대법당에서 나오면 도량으로 돌아갑니다. */
export const MAP_LINKS=Object.freeze({yard:'/deungbul.html'})
export function hallReturnUrl(){return '/deungbul.html?from=beopdang'}
