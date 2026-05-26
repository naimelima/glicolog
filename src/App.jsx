import { useState, useEffect } from 'react'
import {
  collection, addDoc, onSnapshot,
  query, where, serverTimestamp,
} from 'firebase/firestore'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { db, auth } from './firebase'
import { getGlucoseStatus, CONTEXTOS } from './utils'
import Login from './Login'
import GraficoGlicemia from './GraficoGlicemia'
import Medicamentos from './Medicamentos'
import Lembretes from './Lembretes'
import { useNotificacoes } from './useNotificacoes'
import BotaoExportarPDF from './ExportarPDF'
import './App.css'

export default function App() {
  // --- Estado de autenticação ---
  const [usuario, setUsuario]         = useState(undefined) // undefined = ainda verificando
  const [aba, setAba]                 = useState('glicemia') // 'glicemia' | 'medicamentos' | 'lembretes'

  // Ativa verificação de lembretes em segundo plano (funciona em qualquer aba)
  useNotificacoes(usuario?.uid)

  // --- Estado da tela principal ---
  const [medicoes, setMedicoes]       = useState([])
  const [carregando, setCarregando]   = useState(true)
  const [erroFirestore, setErroFirestore] = useState(null)
  const [salvando, setSalvando]       = useState(false)
  const [valor, setValor]             = useState('')
  const [contexto, setContexto]       = useState('jejum')
  const [observacao, setObservacao]   = useState('')

  // Observa se o usuário está logado ou não
  useEffect(() => {
    const cancelar = onAuthStateChanged(auth, (user) => {
      setUsuario(user) // user = objeto com dados do usuário, ou null se deslogado
    })
    return () => cancelar()
  }, [])

  // Carrega as medições do Firestore — só quando o usuário estiver logado
  useEffect(() => {
    if (!usuario) {
      setMedicoes([])
      setCarregando(false)
      return
    }

    setCarregando(true)
    const q = query(
      collection(db, 'medicoes'),
      where('userId', '==', usuario.uid)
    )

    const cancelarEscuta = onSnapshot(
      q,
      (snapshot) => {
        const dados = snapshot.docs
          .map((doc) => {
            const data = doc.data()
            return {
              id: doc.id,
              valor: data.valor,
              contexto: data.contexto,
              observacao: data.observacao,
              dataHoraTs: data.dataHora?.toMillis() ?? 0,
              dataHoraFormatada: data.dataHora
                ? data.dataHora.toDate().toLocaleString('pt-BR')
                : '...',
            }
          })
          .sort((a, b) => b.dataHoraTs - a.dataHoraTs)
        setMedicoes(dados)
        setCarregando(false)
        setErroFirestore(null)
      },
      (erro) => {
        console.error('Firestore erro:', erro.code, erro.message)
        setErroFirestore(erro.code + ': ' + erro.message)
        setCarregando(false)
      }
    )

    return () => cancelarEscuta()
  }, [usuario])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!valor || !usuario) return

    setSalvando(true)
    await addDoc(collection(db, 'medicoes'), {
      userId: usuario.uid, // vincula o registro ao usuário logado
      valor: Number(valor),
      contexto,
      observacao,
      dataHora: serverTimestamp(),
    })
    setSalvando(false)
    setValor('')
    setObservacao('')
  }

  // Ainda verificando se há um usuário logado — evita flash de tela
  if (usuario === undefined) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400">Carregando...</p>
      </div>
    )
  }

  // Usuário não está logado — mostra a tela de login
  if (!usuario) {
    return <Login />
  }

  // Usuário logado — mostra o dashboard
  return (
    <div className="min-h-screen bg-gray-50">

      {/* Cabeçalho */}
      <header className="bg-blue-600 text-white px-4 py-3 shadow">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight">GlicoLog</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm opacity-75 hidden sm:block">{usuario.email}</span>
            <button
              onClick={() => signOut(auth)}
              className="text-sm bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg transition-colors"
            >
              Sair
            </button>
          </div>
        </div>

        {/* Abas de navegação */}
        <div className="max-w-2xl mx-auto flex gap-1 mt-3">
          <button
            onClick={() => setAba('glicemia')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              aba === 'glicemia'
                ? 'bg-white text-blue-600'
                : 'text-white/80 hover:text-white hover:bg-white/10'
            }`}
          >
            Glicemia
          </button>
          <button
            onClick={() => setAba('medicamentos')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              aba === 'medicamentos'
                ? 'bg-white text-blue-600'
                : 'text-white/80 hover:text-white hover:bg-white/10'
            }`}
          >
            Medicamentos
          </button>
          <button
            onClick={() => setAba('lembretes')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              aba === 'lembretes'
                ? 'bg-white text-blue-600'
                : 'text-white/80 hover:text-white hover:bg-white/10'
            }`}
          >
            Lembretes
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        {/* Aba Medicamentos */}
        {aba === 'medicamentos' && <Medicamentos usuario={usuario} />}

        {/* Aba Lembretes */}
        {aba === 'lembretes' && <Lembretes usuario={usuario} />}

        {/* Aba Glicemia */}
        {aba === 'glicemia' && <>

        {/* Formulário de registro */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Registrar medição</h2>
          <form onSubmit={handleSubmit} className="space-y-4">

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Glicemia (mg/dL)
              </label>
              <input
                type="number"
                min="20"
                max="600"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                placeholder="Ex: 95"
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contexto da medição
              </label>
              <select
                value={contexto}
                onChange={(e) => setContexto(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {CONTEXTOS.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Observação (opcional)
              </label>
              <input
                type="text"
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                placeholder="Ex: após café da manhã"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {valor && (
              <div className={`rounded-lg px-4 py-2 text-sm font-medium ${getGlucoseStatus(valor).color}`}>
                {getGlucoseStatus(valor).label} — {valor} mg/dL
              </div>
            )}

            <button
              type="submit"
              disabled={salvando}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              {salvando ? 'Salvando...' : 'Salvar medição'}
            </button>
          </form>
        </section>

        {/* Gráfico de evolução */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Evolução</h2>
          {carregando
            ? <p className="text-gray-400 text-sm text-center py-8">Carregando...</p>
            : <GraficoGlicemia medicoes={medicoes} />
          }
        </section>

        {/* Histórico */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Histórico</h2>
            <BotaoExportarPDF medicoes={medicoes} usuarioEmail={usuario.email} />
          </div>

          {erroFirestore ? (
            <p className="text-red-500 text-xs text-center py-6 break-all">{erroFirestore}</p>
          ) : carregando ? (
            <p className="text-gray-400 text-sm text-center py-6">Carregando...</p>
          ) : medicoes.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">
              Nenhuma medição registrada ainda.
            </p>
          ) : (
            <ul className="space-y-3">
              {medicoes.map((m) => {
                const status = getGlucoseStatus(m.valor)
                const ctxLabel = CONTEXTOS.find(c => c.value === m.contexto)?.label ?? m.contexto
                return (
                  <li key={m.id} className="flex items-center justify-between border border-gray-100 rounded-lg px-4 py-3">
                    <div>
                      <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full mr-2 ${status.color}`}>
                        {status.label}
                      </span>
                      <span className="text-gray-500 text-sm">{ctxLabel}</span>
                      {m.observacao && (
                        <p className="text-xs text-gray-400 mt-0.5">{m.observacao}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-800">{m.valor}</p>
                      <p className="text-xs text-gray-400">mg/dL</p>
                      <p className="text-xs text-gray-400">{m.dataHoraFormatada}</p>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        </>}

      </main>
    </div>
  )
}
