import React, { useState } from 'react';
import { X, Save, Loader2, Key, User } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const ProfileModal = ({ onClose }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    username: user?.username || '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password && formData.password !== formData.confirmPassword) {
      toast.error('As palavras-passe não coincidem.');
      return;
    }

    setLoading(true);
    try {
      await api.put('/users/profile', {
        username: formData.username,
        password: formData.password || undefined
      });
      
      toast.success('Perfil atualizado com sucesso!');
      
      if (formData.password || formData.username !== user.username) {
        toast.success('Por favor, faça login novamente com as suas novas credenciais.', { duration: 6000 });
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        onClose();
      }
    } catch (error) {
      toast.error(error.response?.data?.error?.message || 'Erro ao atualizar perfil.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b flex justify-between items-center bg-primary text-white">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <User size={24} />
            O Meu Perfil
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold flex items-center gap-2">
              <User size={16} className="text-primary" />
              Nome de Utilizador
            </label>
            <input 
              type="text" 
              value={formData.username}
              onChange={e => setFormData({...formData, username: e.target.value})}
              className="w-full bg-secondary/50 border-none rounded-xl p-3 outline-none focus:ring-2 focus:ring-primary/20 font-bold text-slate-800"
              placeholder="O seu nome de acesso"
              required
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              * Ao alterar o seu nome de utilizador, terá de o utilizar no próximo login.
            </p>
          </div>
          
          <div className="space-y-4 pt-4 border-t">
            <h3 className="text-sm font-bold flex items-center gap-2 text-slate-700">
              <Key size={16} />
              Alterar Palavra-passe
            </h3>
            <p className="text-[11px] text-slate-500 mb-2">Deixe em branco se não quiser alterar.</p>
            
            <div className="space-y-2">
              <input 
                type="password" 
                value={formData.password}
                onChange={e => setFormData({...formData, password: e.target.value})}
                className="w-full bg-secondary/50 border-none rounded-xl p-3 outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="Nova Palavra-passe"
              />
            </div>

            <div className="space-y-2">
              <input 
                type="password" 
                value={formData.confirmPassword}
                onChange={e => setFormData({...formData, confirmPassword: e.target.value})}
                className="w-full bg-secondary/50 border-none rounded-xl p-3 outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="Confirmar Nova Palavra-passe"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t mt-4">
            <button 
              type="button" 
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors font-bold text-sm"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-white px-6 py-2 rounded-lg transition-all font-bold text-sm shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="animate-spin" size={16} />}
              <Save size={18} />
              Guardar Alterações
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileModal;
