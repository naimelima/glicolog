import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { getGlucoseStatus, CONTEXTOS } from './utils'

// Calcula estatísticas resumidas para o cabeçalho do relatório
function calcularEstatisticas(medicoes) {
  if (!medicoes.length) return null

  const valores = medicoes.map(m => m.valor)
  const soma = valores.reduce((a, b) => a + b, 0)
  const media = Math.round(soma / valores.length)
  const minimo = Math.min(...valores)
  const maximo = Math.max(...valores)

  const normal  = medicoes.filter(m => m.valor >= 70 && m.valor <= 99).length
  const atencao = medicoes.filter(m => m.valor >= 100 && m.valor <= 125).length
  const alto    = medicoes.filter(m => m.valor > 125).length
  const hipo    = medicoes.filter(m => m.valor < 70).length

  const pct = (n) => `${Math.round((n / medicoes.length) * 100)}%`

  return { media, minimo, maximo, normal, atencao, alto, hipo, pct, total: medicoes.length }
}

export function gerarPDF(medicoes, usuarioEmail) {
  if (!medicoes.length) return

  const doc = new jsPDF()
  const stats = calcularEstatisticas(medicoes)
  const geradoEm = new Date().toLocaleString('pt-BR')

  // ── Cabeçalho ──────────────────────────────────────────────
  doc.setFillColor(37, 99, 235) // azul
  doc.rect(0, 0, 210, 32, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.text('GlicoLog', 14, 14)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('Relatório de Acompanhamento de Glicemia', 14, 22)
  doc.text(`Gerado em: ${geradoEm}`, 14, 29)

  // ── Dados do paciente ───────────────────────────────────────
  doc.setTextColor(50, 50, 50)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('Paciente', 14, 44)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(usuarioEmail, 14, 51)

  if (medicoes.length > 0) {
    const primeiro = medicoes[medicoes.length - 1].dataHoraFormatada
    const ultimo   = medicoes[0].dataHoraFormatada
    doc.text(`Período: ${primeiro} até ${ultimo}`, 14, 57)
  }

  // ── Estatísticas resumidas ──────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('Resumo', 14, 70)

  // Caixinhas de estatística
  const caixas = [
    { titulo: 'Total de medições', valor: String(stats.total) },
    { titulo: 'Média',             valor: `${stats.media} mg/dL` },
    { titulo: 'Mínimo',            valor: `${stats.minimo} mg/dL` },
    { titulo: 'Máximo',            valor: `${stats.maximo} mg/dL` },
  ]

  caixas.forEach((c, i) => {
    const x = 14 + i * 47
    doc.setDrawColor(220, 220, 220)
    doc.setFillColor(248, 250, 252)
    doc.roundedRect(x, 74, 43, 18, 2, 2, 'FD')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(100, 100, 100)
    doc.text(c.titulo, x + 4, 81)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(30, 30, 30)
    doc.text(c.valor, x + 4, 89)
  })

  // Distribuição por faixa
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(80, 80, 80)
  const distY = 100
  doc.text(`Normal (70–99):  ${stats.normal} medições (${stats.pct(stats.normal)})`, 14, distY)
  doc.text(`Atenção (100–125): ${stats.atencao} medições (${stats.pct(stats.atencao)})`, 80, distY)
  doc.text(`Alto (>125): ${stats.alto} medições (${stats.pct(stats.alto)})`, 150, distY)
  if (stats.hipo > 0) {
    doc.setTextColor(200, 0, 0)
    doc.text(`Hipoglicemia (<70): ${stats.hipo} medições (${stats.pct(stats.hipo)})`, 14, distY + 6)
    doc.setTextColor(80, 80, 80)
  }

  // ── Tabela de medições ──────────────────────────────────────
  autoTable(doc, {
    startY: 112,
    head: [['Data / Hora', 'Contexto', 'Glicemia', 'Status', 'Observação']],
    body: medicoes.map(m => [
      m.dataHoraFormatada,
      CONTEXTOS.find(c => c.value === m.contexto)?.label ?? m.contexto,
      `${m.valor} mg/dL`,
      getGlucoseStatus(m.valor).label,
      m.observacao || '—',
    ]),
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [50, 50, 50],
    },
    // Colorir a coluna de status de acordo com a faixa
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 3) {
        const label = data.cell.raw
        if (label === 'Normal')             data.cell.styles.textColor = [21, 128, 61]
        else if (label === 'Atenção')       data.cell.styles.textColor = [161, 98, 7]
        else if (label === 'Alto')          data.cell.styles.textColor = [194, 65, 12]
        else if (label.includes('Hipo'))    data.cell.styles.textColor = [185, 28, 28]
      }
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 },
  })

  // ── Rodapé ──────────────────────────────────────────────────
  const totalPaginas = doc.internal.getNumberOfPages()
  for (let i = 1; i <= totalPaginas; i++) {
    doc.setPage(i)
    const alturaDoc = doc.internal.pageSize.height
    doc.setFontSize(8)
    doc.setTextColor(160, 160, 160)
    doc.text(
      'Este relatório é uma ferramenta de acompanhamento pessoal. Consulte sempre seu médico.',
      14, alturaDoc - 8
    )
    doc.text(`Página ${i} de ${totalPaginas}`, 185, alturaDoc - 8, { align: 'right' })
  }

  doc.save(`relatorio-glicemia-${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.pdf`)
}

export default function BotaoExportarPDF({ medicoes, usuarioEmail }) {
  function handleClick() {
    gerarPDF(medicoes, usuarioEmail)
  }

  return (
    <button
      onClick={handleClick}
      disabled={medicoes.length === 0}
      title={medicoes.length === 0 ? 'Sem medições para exportar' : 'Baixar relatório em PDF'}
      className="text-sm border border-gray-300 hover:border-blue-400 hover:text-blue-600 text-gray-600 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
    >
      Exportar PDF
    </button>
  )
}
