import { useEffect, useRef } from 'react'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { db } from './firebase'

// Hook que escuta os lembretes ativos e dispara notificações do navegador no horário certo.
// Deve ser chamado no App.jsx para funcionar em todas as abas, não só em "Lembretes".
export function useNotificacoes(userId) {
  const lembretesRef = useRef([])   // ref para não causar re-render ao atualizar
  const disparadosRef = useRef(new Set()) // chaves dos lembretes já disparados hoje

  // Pede permissão para notificações na primeira vez
  useEffect(() => {
    if (!('Notification' in window)) return
    if (Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  // Escuta lembretes do Firestore (só os ativos)
  useEffect(() => {
    if (!userId) return
    const q = query(collection(db, 'lembretes'), where('userId', '==', userId))
    return onSnapshot(q, (snap) => {
      lembretesRef.current = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(l => l.ativo)
    })
  }, [userId])

  // Verifica a cada 30 segundos se algum lembrete deve disparar
  useEffect(() => {
    if (!userId) return

    function verificar() {
      if (!('Notification' in window)) return
      if (Notification.permission !== 'granted') return

      const agora = new Date()
      const horaAtual = `${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`
      const diaAtual = agora.getDay() // 0=Dom, 1=Seg, ..., 6=Sáb

      lembretesRef.current.forEach(lembrete => {
        if (lembrete.horario !== horaAtual) return
        if (!deveDisparar(lembrete.diasSemana, diaAtual)) return

        // Chave única por lembrete + dia + hora — evita disparar duas vezes no mesmo minuto
        const chave = `${lembrete.id}_${agora.toDateString()}_${horaAtual}`
        if (disparadosRef.current.has(chave)) return
        disparadosRef.current.add(chave)

        const corpo = lembrete.tipo === 'glicemia'
          ? 'Hora de medir a glicemia!'
          : `Hora de tomar: ${lembrete.medicamentoNome}`

        new Notification('GlicoLog', { body: corpo })
      })
    }

    const intervalo = setInterval(verificar, 30_000)
    verificar() // verifica imediatamente ao abrir o app
    return () => clearInterval(intervalo)
  }, [userId])
}

function deveDisparar(diasSemana, diaAtual) {
  if (diasSemana === 'todos') return true
  if (diasSemana === 'uteis') return diaAtual >= 1 && diaAtual <= 5
  if (diasSemana === 'fds')   return diaAtual === 0 || diaAtual === 6
  return true
}
