export const CONTEXTOS = [
  { value: 'jejum',           label: 'Em jejum' },
  { value: 'pre_refeicao',    label: 'Antes da refeição' },
  { value: 'pos_refeicao_1h', label: '1h após refeição' },
  { value: 'pos_refeicao_2h', label: '2h após refeição' },
  { value: 'antes_dormir',    label: 'Antes de dormir' },
  { value: 'madrugada',       label: 'Madrugada' },
  { value: 'outro',           label: 'Outro' },
]

export function getGlucoseStatus(value) {
  const v = Number(value)
  if (v < 54)   return { label: 'Hipoglicemia grave', color: 'bg-red-700 text-white',    hex: '#b91c1c' }
  if (v < 70)   return { label: 'Hipoglicemia',       color: 'bg-red-500 text-white',    hex: '#ef4444' }
  if (v <= 99)  return { label: 'Normal',             color: 'bg-green-500 text-white',  hex: '#22c55e' }
  if (v <= 125) return { label: 'Atenção',            color: 'bg-yellow-400 text-black', hex: '#eab308' }
  return         { label: 'Alto',                     color: 'bg-orange-500 text-white', hex: '#f97316' }
}
