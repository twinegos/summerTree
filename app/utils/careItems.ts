// 식물 정보 항목 정의 (관리자 입력 / 상세 페이지 / AI 자동작성 공유)
export interface CareItem {
  key: string
  icon: string
  label: string
  placeholder: string // C 톤(식물 1인칭) 예시
}

export const CARE_ITEMS: CareItem[] = [
  { key: 'sunlight', icon: '☀️', label: '햇빛', placeholder: '예: 저는 밝은 곳이 좋아요! 직사광선은 조금 따가워요.' },
  { key: 'water', icon: '💧', label: '물주기', placeholder: '예: 목마를 때 듬뿍 주시면 행복해요!' },
  { key: 'temperature', icon: '🌡️', label: '온도', placeholder: '예: 18~25도에서 가장 기분이 좋아요.' },
  { key: 'humidity', icon: '💨', label: '습도', placeholder: '예: 촉촉한 공기를 좋아해요. 가끔 분무해주세요!' },
  { key: 'soil', icon: '🪴', label: '흙·분갈이', placeholder: '예: 물 잘 빠지는 흙이 좋아요. 1~2년에 한 번 새 집으로!' },
  { key: 'caution', icon: '⚠️', label: '주의사항', placeholder: '예: 반려동물이 먹지 않게 조심해주세요!' },
]

export type CareInfo = Record<string, string>
