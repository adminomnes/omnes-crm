import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return toast.error('Ingrese correo y contraseña');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      setAuth(data.user, data.token);
      toast.success(`Bienvenido, ${data.user.name}`);
      navigate('/');
    } catch {
      // error handled by interceptor
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-950 via-primary-900 to-primary-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl mb-4">
            <Building2 className="w-8 h-8 text-primary-800" />
          </div>
          <h1 className="text-3xl font-bold text-white">OMNES</h1>
          <p className="text-primary-200 mt-1">Sistema de Gestión Comercial</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl p-8 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Correo Electrónico</label>
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="input-field" placeholder="ejecutivo@omnes.cl" required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Contraseña</label>
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'} value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field pr-10" placeholder="Ingrese su contraseña" required
              />
              <button type="button" onClick={() => setShowPwd(!showPwd)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full py-3">
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
        <p className="text-center text-primary-300 text-xs mt-6">
          OMNES Holding &copy; {new Date().getFullYear()} - Todos los derechos reservados
        </p>
      </div>
    </div>
  );
}
