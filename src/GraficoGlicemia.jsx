import {
  ResponsiveContainer, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
} from 'recharts'
import { getGlucoseStatus } from './utils'

// Ponto colorido: cada bolinha no gráfico tem a cor da faixa de glicemia
function DotColorido({ cx, cy, payload }) {
  if (cx == null || cy == null) return null
  const cor = getGlucoseStatus(payload.valor).hex
  return <circle cx={cx} cy={cy} r={5} fill={cor} stroke="white" strokeWidth={1.5} />
}

// Caixinha que aparece ao passar o mouse sobre um ponto
function TooltipCustom({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  const status = getGlucoseStatus(d.valor)
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-md px-3 py-2 text-sm">
      <p className="font-bold text-gray-800 text-base">{d.valor} <span className="text-xs font-normal text-gray-400">mg/dL</span></p>
      <p className="text-gray-400 text-xs">{d.dataHora}</p>
      <span className={`inline-block mt-1 text-xs font-semibold px-2 py-0.5 rounded-full ${status.color}`}>
        {status.label}
      </span>
    </div>
  )
}

export default function GraficoGlicemia({ medicoes }) {
  // O histórico vem do mais novo para o mais antigo; o gráfico precisa ser do mais antigo para o mais novo
  const dados = [...medicoes].reverse().map((m) => ({
    valor: m.valor,
    dataHora: m.dataHoraFormatada,
    // Exibe só a data no eixo X para não poluir
    eixoX: m.dataHoraFormatada.split(',')[0],
  }))

  if (dados.length < 2) {
    return (
      <p className="text-gray-400 text-sm text-center py-8">
        Registre pelo menos 2 medições para ver o gráfico.
      </p>
    )
  }

  return (
    <div>
      {/* Legenda das linhas de referência */}
      <div className="flex flex-wrap gap-3 mb-4 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span className="w-4 border-t-2 border-dashed border-red-400 inline-block" /> 70 mg/dL — limite hipoglicemia
        </span>
        <span className="flex items-center gap-1">
          <span className="w-4 border-t-2 border-dashed border-yellow-400 inline-block" /> 100 mg/dL — limite atenção
        </span>
        <span className="flex items-center gap-1">
          <span className="w-4 border-t-2 border-dashed border-orange-400 inline-block" /> 126 mg/dL — limite alto
        </span>
      </div>

      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={dados} margin={{ top: 10, right: 16, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />

          <XAxis
            dataKey="eixoX"
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            interval="preserveStartEnd"
          />

          <YAxis
            domain={[40, 'auto']}
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            width={40}
          />

          <Tooltip content={<TooltipCustom />} />

          {/* Linhas horizontais de referência clínica */}
          <ReferenceLine y={70}  stroke="#ef4444" strokeDasharray="5 3" strokeWidth={1.5} />
          <ReferenceLine y={100} stroke="#eab308" strokeDasharray="5 3" strokeWidth={1.5} />
          <ReferenceLine y={126} stroke="#f97316" strokeDasharray="5 3" strokeWidth={1.5} />

          <Line
            type="monotone"
            dataKey="valor"
            stroke="#2563eb"
            strokeWidth={2}
            dot={<DotColorido />}
            activeDot={{ r: 7, stroke: '#2563eb', strokeWidth: 2, fill: 'white' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
