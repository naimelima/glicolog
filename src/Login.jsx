import { useState } from 'react'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth'
import { auth } from './firebase'

export default function Login() {
  const [modo, setModo]           = useState('login')   // 'login' ou 'cadastro'
  const [email, setEmail]         = useState('')
  const [senha, setSenha]         = useState('')
  const [erro, setErro]           = useState('')
  const [carregando, setCarregando] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setErro('')
    setCarregando(true)

    try {
      if (modo === 'cadastro') {
        await createUserWithEmailAndPassword(auth, email, senha)
      } else {
        await signInWithEmailAndPassword(auth, email, senha)
      }
      // Se chegou aqui, o login/cadastro funcionou.
      // O App.jsx vai detectar automaticamente que o usuário entrou.
    } catch (e) {
      setErro(traduzirErro(e.code))
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-sm border border-gray-200 p-6">

        {/* Logo / título */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-blue-600">GlicoLog</h1>
          <p className="text-sm text-gray-500 mt-1">Acompanhamento de glicemia</p>
        </div>

        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          {modo === 'login' ? 'Entrar' : 'Criar conta'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder={modo === 'cadastro' ? 'Mínimo 6 caracteres' : '••••••••'}
              required
              minLength={6}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Mensagem de erro */}
          {erro && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {erro}
            </p>
          )}

          <button
            type="submit"
            disabled={carregando}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            {carregando
              ? 'Aguarde...'
              : modo === 'login' ? 'Entrar' : 'Criar conta'}
          </button>
        </form>

        {/* Alternar entre login e cadastro */}
        <p className="text-sm text-center text-gray-500 mt-4">
          {modo === 'login' ? 'Não tem uma conta?' : 'Já tem uma conta?'}{' '}
          <button
            onClick={() => { setModo(modo === 'login' ? 'cadastro' : 'login'); setErro('') }}
            className="text-blue-600 font-medium hover:underline"
          >
            {modo === 'login' ? 'Criar conta' : 'Entrar'}
          </button>
        </p>
      </div>

      <p className="text-xs text-gray-400 mt-6 text-center max-w-xs">
        Este app é uma ferramenta de acompanhamento pessoal. Consulte sempre seu médico.
      </p>
    </div>
  )
}

// Converte os códigos de erro do Firebase para mensagens em português
function traduzirErro(code) {
  const erros = {
    'auth/user-not-found':      'E-mail não encontrado. Verifique ou crie uma conta.',
    'auth/wrong-password':      'Senha incorreta. Tente novamente.',
    'auth/email-already-in-use':'Este e-mail já está cadastrado. Faça login.',
    'auth/weak-password':       'A senha precisa ter pelo menos 6 caracteres.',
    'auth/invalid-email':       'E-mail inválido.',
    'auth/invalid-credential':  'E-mail ou senha incorretos.',
    'auth/too-many-requests':   'Muitas tentativas. Aguarde alguns minutos e tente novamente.',
  }
  return erros[code] ?? 'Ocorreu um erro. Tente novamente.'
}
