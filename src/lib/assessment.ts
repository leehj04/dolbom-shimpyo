// 난이도 자동 산정 로직 (프로토타입 assess() 포팅)
// 총점 0~7점 → 1단계(경도), 8~15점 → 2단계(중등도), 16점 이상 → 3단계(중증)
// 단가: 1단계 20,000원 · 2단계 25,000원 · 3단계 30,000원

export const COGNITION_OPTIONS = [
  { value: 0, label: '일상적인 의사소통 가능' },
  { value: 2, label: '일부 도움 필요' },
  { value: 4, label: '지속적인 관찰 필요' },
] as const

export const ADL_ITEMS = [
  { key: 'eat', label: '식사' },
  { key: 'dress', label: '옷 입기' },
  { key: 'toilet', label: '배변' },
  { key: 'move', label: '이동' },
] as const

export const ADL_OPTIONS = [
  { value: 0, label: '독립' },
  { value: 1, label: '부분도움' },
  { value: 2, label: '전적도움' },
] as const

export const BPSD_ITEMS = [
  { key: 'wander', label: '배회', weight: 2 },
  { key: 'agitation', label: '초조·공격성', weight: 2 },
  { key: 'delusion', label: '망상·환각', weight: 2 },
  { key: 'depression', label: '우울·불안', weight: 1 },
  { key: 'sleep', label: '수면장애', weight: 1 },
  { key: 'appetite', label: '식욕 변화', weight: 1 },
] as const

export const MOBILITY_OPTIONS = [
  { value: 0, label: '실내외 독립 보행' },
  { value: 2, label: '실내 독립, 외출 시 부축' },
  { value: 4, label: '휠체어·침상 생활' },
] as const

export type AssessmentInput = {
  cognitionScore: number
  adlItems: Record<string, number>
  bpsdItems: string[] // 선택된 BPSD item key 목록
  mobilityScore: number
}

export type AssessmentResult = {
  cognitionScore: number
  adlItems: Record<string, number>
  adlTotal: number
  bpsdItems: { key: string; weight: number }[]
  bpsdTotal: number
  mobilityScore: number
  totalScore: number
  level: 1 | 2 | 3
  hourlyRate: number
  levelName: string
}

export function computeAssessment(input: AssessmentInput): AssessmentResult {
  const adlTotal = Object.values(input.adlItems).reduce((sum, v) => sum + v, 0)

  const bpsdSelected = BPSD_ITEMS.filter((item) => input.bpsdItems.includes(item.key))
  const bpsdTotal = bpsdSelected.reduce((sum, item) => sum + item.weight, 0)

  const totalScore = input.cognitionScore + adlTotal + bpsdTotal + input.mobilityScore

  const level: 1 | 2 | 3 = totalScore <= 7 ? 1 : totalScore <= 15 ? 2 : 3
  const hourlyRate = level === 1 ? 20000 : level === 2 ? 25000 : 30000
  const levelName = { 1: '경도', 2: '중등도', 3: '중증' }[level]

  return {
    cognitionScore: input.cognitionScore,
    adlItems: input.adlItems,
    adlTotal,
    bpsdItems: bpsdSelected.map(({ key, weight }) => ({ key, weight })),
    bpsdTotal,
    mobilityScore: input.mobilityScore,
    totalScore,
    level,
    hourlyRate,
    levelName,
  }
}
