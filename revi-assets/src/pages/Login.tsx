import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [nombre, setNombre] = useState('');

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Email y contraseña requeridos');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || 'Error en login');
      }

      const { token, usuario } = await res.json();
      localStorage.setItem('revi_token', token);
      localStorage.setItem('revi_usuario', usuario); // Para compatibilidad con UI
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al conectar');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!email.trim() || !password.trim() || !nombre.trim()) {
      setError('Todos los campos son requeridos');
      return;
    }
    if (password.length < 6) {
      setError('Contraseña debe tener al menos 6 caracteres');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, usuario: nombre }),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || 'Error en registro');
      }

      setError('');
      setIsRegister(false);
      setEmail('');
      setPassword('');
      setNombre('');
      alert('Usuario creado. Inicia sesión.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear usuario');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-red-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 space-y-6">
        <div className="text-center">
          <img src="/logo-revi-cables.jpg" alt="REVI" className="h-16 mx-auto object-contain mb-3" />
          <h1 className="text-2xl font-bold text-gray-900">REVI Assets</h1>
          <p className="text-gray-400 text-sm mt-1">Control Activo Fijo Industrial</p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && (isRegister ? handleRegister() : handleLogin())}
              placeholder="tu@email.com"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-600"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && (isRegister ? handleRegister() : handleLogin())}
              placeholder="••••••••"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-600"
            />
          </div>

          {isRegister && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre (para auditoría)
              </label>
              <input
                type="text"
                value={nombre}
                onChange={e => { setNombre(e.target.value); setError(''); }}
                placeholder="Tu nombre"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-600"
              />
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3">
              <p className="text-red-700 text-xs">{error}</p>
            </div>
          )}

          <button
            onClick={isRegister ? handleRegister : handleLogin}
            disabled={loading}
            className="w-full bg-red-700 text-white rounded-xl py-3.5 font-semibold flex items-center justify-center gap-2 active:bg-red-800 disabled:opacity-60"
          >
            {loading ? <><Loader2 size={18} className="animate-spin" /> Cargando...</> : (isRegister ? 'Crear Cuenta' : 'Ingresar')}
          </button>

          <button
            onClick={() => {
              setIsRegister(!isRegister);
              setError('');
              setEmail('');
              setPassword('');
              setNombre('');
            }}
            className="w-full text-center text-sm text-gray-500 py-2"
          >
            {isRegister ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Crear una'}
          </button>
        </div>

        <p className="text-center text-xs text-gray-400">
          Usa credenciales seguras — la contraseña se cifra con bcrypt
        </p>
      </div>
    </div>
  );
}
