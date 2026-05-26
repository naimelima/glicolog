import { useState, useEffect } from 'react'
import {
  collection, addDoc, onSnapshot,
  query, where, serverTimestamp,
} from 'firebase/firestore'
import { db } from './firebase'

const TIPOS = [
  { value: 'insulina_basal', label: 'Insulina basal (ação longa)' },
  { value: 'insulina_bolus', label: 'Insulina bólus (ação rápida)' },
  { value: 'oral',           label: 'Medicamento oral (comprimido/cápsula)' },
  { value: 'outro',          label: 'Outro' },
]

const UNIDADES = [
  { value: 'UI',          label: 'UI — unidades de insulina' },
  { value: 'mg',          label: 'mg — miligramas' },
  { value: 'comprimidos', label: 'comprimido(s)' },
  { value: 'ml',          label: 'ml — mililitros' },
]

export default function Medicamentos({ usuario }) {
  const [medicamentos, setMedicamentos]   = useState([])
  const [registros, setRegistros]         = useState([])
  const [carregando, setCarregando]       = useState(true)
  const [mostrarForm, setMostrarForm]     = useState(false)

  // Campos — cadastro de medicamento
  const [nome, setNome]               = useState('')
  const [tipo, setTipo]               = useState('oral')
  const [dosePadrao, setDosePadrao]   = useState('')
  const [unidade, setUnidade]         = useState('mg')
  const [salvandoMed, setSalvandoMed] = useState(false)

  // Campos — registro de dose
  const [medId, setMedId]             = useState('')
  const [doseUsada, setDoseUsada]     = useState('')
  const [obs, setObs]                 = useState('')
  const [salvandoReg, setSalvandoReg] = useState(false)

  // Escuta medicamentos cadastrados
  useEffect(() => {
    const q = query(
      collection(db, 'medicamentos'),
      where('userId', '==', usuario.uid)
    )
    return onSnapshot(q, (snap) => {
      const dados = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => a.nome?.localeCompare(b.nome)) // ordena por nome em JS
      setMedicamentos(dados)
      setCarregando(false)
    })
  }, [usuario.uid])

  // Escuta histórico de doses
  useEffect(() => {
    const q = query(
      collection(db, 'registrosMedicamento'),
      where('userId', '==', usuario.uid)
    )
    return onSnapshot(q, (snap) => {
      const dados = snap.docs
        .map(d => {
          const data = d.data()
          return {
            id: d.id,
            ...data,
            dataHoraTs: data.dataHora?.toMillis() ?? 0,
            dataHoraFormatada: data.dataHora?.toDate().toLocaleString('pt-BR') ?? '...',
          }
        })
        .sort((a, b) => b.dataHoraTs - a.dataHoraTs) // mais recente primeiro
      setRegistros(dados)
    })
  }, [usuario.uid])

  async function handleSalvarMedicamento(e) {
    e.preventDefault()
    setSalvandoMed(true)
    await addDoc(collection(db, 'medicamentos'), {
      userId: usuario.uid,
      nome,
      tipo,
      dosePadrao: dosePadrao !== '' ? Number(dosePadrao) : null,
      unidade,
    })
    setSalvandoMed(false)
    setNome('')
    setDosePadrao('')
    setTipo('oral')
    setUnidade('mg')
    setMostrarForm(false)
  }

  async function handleSalvarRegistro(e) {
    e.preventDefault()
    if (!medId) return
    const med = medicamentos.find(m => m.id === medId)
    setSalvandoReg(true)
    await addDoc(collection(db, 'registrosMedicamento'), {
      userId: usuario.uid,
      medicamentoId: medId,
      medicamentoNome: med.nome,
      medicamentoTipo: med.tipo,
      dose: doseUsada !== '' ? Number(doseUsada) : null,
      unidade: med.unidade,
      observacao: obs,
      dataHora: serverTimestamp(),
    })
    setSalvandoReg(false)
    setDoseUsada('')
    setObs('')
  }

  const medAtual = medicamentos.find(m => m.id === medId)

  return (
    <div className="space-y-6">

      {/* ── Registrar dose ── */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Registrar dose</h2>

        {!carregando && medicamentos.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-4">
            Cadastre um medicamento abaixo para começar a registrar doses.
          </p>
        ) : (
          <form onSubmit={handleSalvarRegistro} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Medicamento</label>
              <select
                value={medId}
                onChange={(e) => {
                  setMedId(e.target.value)
                  const med = medicamentos.find(m => m.id === e.target.value)
                  // Pré-preenche com a dose padrão cadastrada
                  setDoseUsada(med?.dosePadrao != null ? String(med.dosePadrao) : '')
                }}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecione...</option>
                {medicamentos.map(m => (
                  <option key={m.id} value={m.id}>{m.nome}</option>
                ))}
              </select>
            </div>

            {medId && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dose ({medAtual?.unidade})
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={doseUsada}
                  onChange={(e) => setDoseUsada(e.target.value)}
                  placeholder="Quantidade"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Observação (opcional)</label>
              <input
                type="text"
                value={obs}
                onChange={(e) => setObs(e.target.value)}
                placeholder="Ex: junto com o jantar"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={salvandoReg}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              {salvandoReg ? 'Salvando...' : 'Registrar dose'}
            </button>
          </form>
        )}
      </section>

      {/* ── Histórico de doses ── */}
      {registros.length > 0 && (
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Histórico de doses</h2>
          <ul className="space-y-3">
            {registros.map(r => (
              <li key={r.id} className="flex items-center justify-between border border-gray-100 rounded-lg px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-gray-800">{r.medicamentoNome}</p>
                  <p className="text-xs text-gray-400">
                    {TIPOS.find(t => t.value === r.medicamentoTipo)?.label ?? r.medicamentoTipo}
                  </p>
                  {r.observacao && (
                    <p className="text-xs text-gray-400 mt-0.5">{r.observacao}</p>
                  )}
                </div>
                <div className="text-right">
                  {r.dose != null && (
                    <p className="text-xl font-bold text-gray-800">
                      {r.dose}{' '}
                      <span className="text-xs font-normal text-gray-400">{r.unidade}</span>
                    </p>
                  )}
                  <p className="text-xs text-gray-400">{r.dataHoraFormatada}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── Meus medicamentos ── */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">Meus medicamentos</h2>
          <button
            onClick={() => setMostrarForm(!mostrarForm)}
            className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-colors"
          >
            {mostrarForm ? 'Cancelar' : '+ Adicionar'}
          </button>
        </div>

        {/* Formulário de cadastro */}
        {mostrarForm && (
          <form onSubmit={handleSalvarMedicamento} className="space-y-4 mb-6 pb-6 border-b border-gray-100">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Metformina, Insulina Glargina"
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {TIPOS.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dose padrão <span className="text-gray-400">(opcional)</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={dosePadrao}
                  onChange={(e) => setDosePadrao(e.target.value)}
                  placeholder="Ex: 500"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="w-40">
                <label className="block text-sm font-medium text-gray-700 mb-1">Unidade</label>
                <select
                  value={unidade}
                  onChange={(e) => setUnidade(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {UNIDADES.map(u => (
                    <option key={u.value} value={u.value}>{u.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={salvandoMed}
              className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              {salvandoMed ? 'Salvando...' : 'Salvar medicamento'}
            </button>
          </form>
        )}

        {/* Lista */}
        {carregando ? (
          <p className="text-gray-400 text-sm text-center py-4">Carregando...</p>
        ) : medicamentos.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-4">
            Nenhum medicamento cadastrado ainda.
          </p>
        ) : (
          <ul className="space-y-2">
            {medicamentos.map(m => (
              <li key={m.id} className="flex items-center justify-between border border-gray-100 rounded-lg px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-gray-800">{m.nome}</p>
                  <p className="text-xs text-gray-400">
                    {TIPOS.find(t => t.value === m.tipo)?.label ?? m.tipo}
                  </p>
                </div>
                {m.dosePadrao != null && (
                  <p className="text-sm text-gray-500 font-medium">
                    {m.dosePadrao} {m.unidade}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

    </div>
  )
}
