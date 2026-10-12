/**
 * 이용방법 카드 목록. 원본은 docs/cardnews/*.png (1080×1350),
 * 앱에서는 public/guide/NN.webp (810×1012) 로 축소한 사본을 쓴다.
 */
export interface GuideCard {
  src: string;
  title: string;
}

export const GUIDE_CARDS: GuideCard[] = [
  { src: "/guide/01.webp", title: "가족 퀘스트 이용방법" },
  { src: "/guide/02.webp", title: "홈 화면에 설치" },
  { src: "/guide/03.webp", title: "로그인" },
  { src: "/guide/04.webp", title: "오늘 화면" },
  { src: "/guide/05.webp", title: "가족 공동 퀘스트와 응원" },
  { src: "/guide/06.webp", title: "습관 추가" },
  { src: "/guide/07.webp", title: "기록" },
  { src: "/guide/08.webp", title: "보상" },
  { src: "/guide/09.webp", title: "계획과 퀘스트 지도 (부모)" },
  { src: "/guide/10.webp", title: "설정" },
];

export const GUIDE_CARD_WIDTH = 810;
export const GUIDE_CARD_HEIGHT = 1012;
