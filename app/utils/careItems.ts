// 식물 정보 항목 정의 (관리자 입력 / 상세 페이지 / AI 자동작성 공유)
export interface CareItem {
  key: string
  icon: string
  label: string
  placeholder: string // A 톤(따뜻한 존댓말) 예시
}

export const CARE_ITEMS: CareItem[] = [
  { key: 'sunlight', icon: '☀️', label: '햇빛', placeholder: '예: 밝은 곳을 좋아해요. 직사광선은 살짝 피해주세요.' },
  { key: 'water', icon: '💧', label: '물주기', placeholder: '예: 흙이 마르면 듬뿍 주세요. 과습은 싫어한답니다.' },
  { key: 'temperature', icon: '🌡️', label: '온도', placeholder: '예: 18~25도가 가장 편안해요.' },
  { key: 'humidity', icon: '💨', label: '습도', placeholder: '예: 촉촉한 공기를 좋아해요. 가끔 분무해주세요.' },
  { key: 'soil', icon: '🪴', label: '흙·분갈이', placeholder: '예: 물 잘 빠지는 흙이 좋아요. 1~2년에 한 번 분갈이 해주세요.' },
  { key: 'caution', icon: '⚠️', label: '주의사항', placeholder: '예: 반려동물이 먹지 않도록 주의해주세요.' },
]

export type CareInfo = Record<string, string>
