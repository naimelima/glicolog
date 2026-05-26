import { useState, useEffect } from 'react'
import {
  collection, addDoc, onSnapshot, updateDoc, deleteDoc,
  doc, query, where, serverTimestamp,
} from 'firebase/firestore'
import { db } from './firebase'

const DIAS_OPCOES = [
  { value: 'todos', label: 'Todos os dias' },
  { value: 'uteis', label: 'Dias úteis (seg – sex)' },
  { value: 'fds',   label: 'Fins de semana (sáb – dom)' },
]

function labelDias(v) {
  return DIAS_OPCOES.find(d => d.value === v)?.label ?? v
}

export default function Lembretes({ usuario }) {
  const [lembretes, setLembretes]       = useState([])
  const [medicamentos, setMedicamentos] = useState([])
  const [carregando, setCarregando]     = useState(true)
  const [mostrarForm, setMostrarForm]   = useState(false)
  const [salvando, setSalvando]         = useState(false)

  // Campos do formulário
  const [tipo, setTipo]         = useState('glicemia')
  const [medId, setMedId]       = useState('')
  const [medNome, setMedNome]   = useState('')
  const [horario, setHorario]   = useState('08:00')
  const [dias, setDias]         = useState('todos')

  const permissao = 'Notification' in window ? Notification.permission : 'unsupported'

  // Escuta lembretes do usuário
  useEffect(() => {
    const q = query(collection(db, 'lembretes'), where('userId', '==', usuario.uid))
    return onSnapshot(q, (snap) => {
      const dados = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (a.horario > b.horario ? 1 : -1)) // ordena por horário em JS
      setLembretes(dados)
      setCarregando(false)
    })
  }, [usuario.uid])

  // Escuta medicamentos para o dropdown
  useEffect(() => {
    const q = query(collection(db, 'medicamentos'), where('userId', '==', usuario.uid))
    return onSnapshot(q, (snap) => {
      setMedicamentos(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
  }, [usuario.uid])

  async function handleSalvar(e) {
    e.preventDefault()
    setSalvando(true)
    await addDoc(collection(db, 'lembretes'), {
      userId: usuario.uid,
      tipo,
      medicamentoId:   tipo === 'medicamento' ? medId   : null,
      medicamentoNome: tipo === 'medicamento' ? medNome : null,
      horario,
      diasSemana: dias,
      ativo: true,
      criadoEm: serverTimestamp(),
    })
    setSalvando(false)
    setTipo('glicemia')
    setMedId('')
    setMedNome('')
    setHorario('08:00')
    setDias('todos')
    setMostrarForm(false)
  }

  async function toggleAtivo(lembrete) {
    await updateDoc(doc(db, 'lembretes', lembrete.id), { ativo: !lembrete.ativo })
  }

  async function handleExcluir(id) {
    await deleteDoc(doc(db, 'lembretes', id))
  }

  function pedirPermissao() {
    Notification.requestPermission()
  }

  return (
    <div className="space-y-6">

      {/* Banner de permissão — aparece se o usuário ainda não autorizou */}
      {permissao === 'default' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start gap-3">
          <div className="flex-1">
            <p className="text-sm font-semibold text-yellow-800">Permitir notificações</p>
            <p className="text-xs text-yellow-700 mt-0.5">
              Para receber lembretes, autorize as notificações deste site no seu navegador.
            </p>
          </div>
          <button
            onClick={pedirPermissao}
            className="text-xs bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1.5 rounded-lg font-medium"
          >
            Permitir
          </button>
        </div>
      )}

      {permissao === 'denied' && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-red-800">Notificações bloqueadas</p>
          <p className="text-xs text-red-700 mt-0.5">
            Você bloqueou as notificações deste site. Para reativar, clique no cadeado na barra de endereço do navegador e altere a permissão de notificações.
          </p>
        </div>
      )}

      {/* Lista de lembretes */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">Meus lembretes</h2>
          <button
            onClick={() => setMostrarForm(!mostrarForm)}
            className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-colors"
          >
            {mostrarForm ? 'Cancelar' : '+ Adicionar'}
          </button>
        </div>

        {/* Formulário de novo lembrete */}
        {mostrarForm && (
          <form onSubmit={handleSalvar} className="space-y-4 mb-6 pb-6 border-b border-gray-100">

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de lembrete</label>
              <select
                value={tipo}
                onChange={(e) => { setTipo(e.target.value); setMedId(''); setMedNome('') }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="glicemia">Medir glicemia</option>
                <option value="medicamento">Tomar medicamento</option>
              </select>
            </div>

            {tipo === 'medicamento' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Medicamento</label>
                {medicamentos.length === 0 ? (
                  <p className="text-xs text-gray-400">
                    Nenhum medicamento cadastrado. Adicione um na aba Medicamentos primeiro.
                  </p>
                ) : (
                  <select
                    value={medId}
                    onChange={(e) => {
                      setMedId(e.target.value)
                      setMedNome(medicamentos.find(m => m.id === e.target.value)?.nome ?? '')
                    }}
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Selecione...</option>
                    {medicamentos.map(m => (
                      <option key={m.id} value={m.id}>{m.nome}</option>
                    ))}
                  </select>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Horário</label>
                <input
                  type="time"
                  value={horario}
                  onChange={(e) => setHorario(e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Dias</label>
                <select
                  value={dias}
                  onChange={(e) => setDias(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {DIAS_OPCOES.map(d => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={salvando || (tipo === 'medicamento' && !medId)}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              {salvando ? 'Salvando...' : 'Salvar lembrete'}
            </button>
          </form>
        )}

        {/* Lista */}
        {carregando ? (
          <p className="text-gray-400 text-sm text-center py-4">Carregando...</p>
        ) : lembretes.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-6">
            Nenhum lembrete configurado ainda.
          </p>
        ) : (
          <ul className="space-y-3">
            {lembretes.map(l => (
              <li
                key={l.id}
                className={`flex items-center justify-between border rounded-lg px-4 py-3 transition-colors ${
                  l.ativo ? 'border-gray-100' : 'border-gray-100 opacity-50'
                }`}
              >
                <div>
                  <p className="text-sm font-semibold text-gray-800">
                    {l.tipo === 'glicemia' ? 'Medir glicemia' : `Tomar: ${l.medicamentoNome}`}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {l.horario} — {labelDias(l.diasSemana)}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {/* Toggle ativo/inativo */}
                  <button
                    onClick={() => toggleAtivo(l)}
                    title={l.ativo ? 'Desativar' : 'Ativar'}
                    className={`relative w-10 h-5 rounded-full transition-colors ${
                      l.ativo ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                      l.ativo ? 'translate-x-5' : 'translate-x-0.5'
                    }`} />
                  </button>

                  {/* Excluir */}
                  <button
                    onClick={() => handleExcluir(l.id)}
                    title="Excluir lembrete"
                    className="text-gray-300 hover:text-red-400 transition-colors text-lg leading-none"
                  >
                    ×
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Informação sobre limitação */}
      <p className="text-xs text-gray-400 text-center px-4">
        Os lembretes funcionam enquanto o app estiver aberto no navegador.
      </p>

    </div>
  )
}
