import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, User, Loader2 } from 'lucide-react';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Falha na autenticação');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] relative overflow-hidden p-4 sm:p-6">
      {/* Decorative radial gradients mimicking the template backdrop */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-primary/10 rounded-full blur-[140px]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-blue-500/10 rounded-full blur-[140px]" />

      {/* Dot grid background pattern */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-40 animate-[pulse_6s_ease-in-out_infinite]"
        style={{
          backgroundImage: 'radial-gradient(#cbd5e1 1.5px, transparent 1.5px)',
          backgroundSize: '30px 30px',
        }}
      />

      <div className="w-full max-w-4xl bg-card rounded-[32px] border border-border shadow-2xl overflow-hidden z-10 grid grid-cols-1 md:grid-cols-2 min-h-[580px] animate-in fade-in duration-300">
        {/* Left Column - Blue Panel (Hidden on mobile) */}
        <div className="hidden md:flex flex-col justify-between bg-primary p-12 text-white relative overflow-hidden">
          {/* Subtle light overlay to match template style */}
          <div className="absolute inset-0 bg-gradient-to-tr from-black/10 to-transparent pointer-events-none" />
          
          <div className="space-y-8 z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center font-black border border-white/25">
                SG
              </div>
              <span className="font-bold tracking-wider text-sm uppercase">SGFS NOCTURNO</span>
            </div>
            
            <div className="space-y-4 pt-4">
              <h2 className="text-3xl font-black leading-tight">
                Plataforma Inteligente de Gestão de Folhas Salariais
              </h2>
              <p className="text-white/80 text-sm leading-relaxed">
                Faça o lançamento, controle e emissão das folhas de salário dos docentes em regime pós-laboral de forma simples, transparente e rápida.
              </p>
            </div>
          </div>

        </div>

        {/* Right Column - Login Form */}
        <div className="flex flex-col justify-between p-8 sm:p-12 bg-white dark:bg-card">
          <div className="my-auto space-y-8">
            <div className="space-y-2">
              <h3 className="text-2xl font-black text-slate-800 dark:text-white">Sign In</h3>
              <p className="text-xs text-muted-foreground font-medium">
                Insira as suas credenciais de acesso para entrar na plataforma
              </p>
            </div>

            {error && (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive text-xs p-3 rounded-xl text-center font-bold animate-shake">
                ⚠️ {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5 p-6 bg-slate-50/60 dark:bg-slate-900/40 rounded-3xl border border-slate-100 dark:border-slate-800/80 shadow-sm">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Nome de Utilizador</label>
                <div className="relative">
                  <User className="absolute left-3 top-3.5 text-slate-400" size={16} />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-3.5 pl-10 pr-4 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder-slate-400"
                    placeholder="Introduza o seu nome de utilizador"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Palavra-passe</label>
                  <a href="#" onClick={(e) => { e.preventDefault(); alert("Por favor, contacte o Administrador Geral para redefinir a sua palavra-passe."); }} className="text-[10px] font-bold text-primary hover:underline">
                    Esqueceu a palavra-passe?
                  </a>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-3.5 text-slate-400" size={16} />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-3.5 pl-10 pr-4 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder-slate-400"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary hover:bg-primary/95 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-primary/25 transition-all active:scale-[0.98] hover:scale-[1.01] flex items-center justify-center gap-2 text-xs cursor-pointer mt-8"
              >
                {loading ? <Loader2 className="animate-spin" size={16} /> : 'Iniciar Sessão'}
              </button>
            </form>
          </div>

          <div className="pt-8 text-center border-t border-slate-100 dark:border-white/5 mt-8">
            <p className="text-[10px] text-muted-foreground font-semibold">
              © 2026 SGFS - Todos os direitos reservados
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
