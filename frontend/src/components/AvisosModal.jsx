import React, { useState, useEffect } from 'react';
import { X, Save, Trash2, Plus, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../services/api';

const AvisosModal = ({ onClose, onAvisosChanged }) => {
  const [avisos, setAvisos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [novoAviso, setNovoAviso] = useState('');

  useEffect(() => {
    fetchAvisos();
  }, []);

  const fetchAvisos = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/avisos');
      setAvisos(data || []);
    } catch (err) {
      toast.error('Erro ao carregar avisos.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!novoAviso.trim()) return;
    
    setSaving(true);
    try {
      await api.post('/avisos', { mensagem: novoAviso, ativo: true });
      toast.success('Aviso criado!');
      setNovoAviso('');
      await fetchAvisos();
      onAvisosChanged();
    } catch (err) {
      toast.error('Erro ao criar aviso.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/avisos/${id}`);
      toast.success('Aviso removido!');
      await fetchAvisos();
      onAvisosChanged();
    } catch (err) {
      toast.error('Erro ao remover aviso.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b flex justify-between items-center bg-primary text-white shrink-0">
          <h2 className="text-xl font-bold flex items-center gap-2">
            Gestão do Quadro de Avisos
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1 space-y-6 bg-slate-50">
          {/* Add New */}
          <form onSubmit={handleAdd} className="bg-white p-4 rounded-xl border shadow-sm space-y-3">
            <label className="text-sm font-bold text-slate-700">Novo Aviso</label>
            <textarea
              value={novoAviso}
              onChange={e => setNovoAviso(e.target.value)}
              placeholder="Escreva a mensagem que aparecerá para os Diretores de Curso..."
              className="w-full bg-secondary/50 border-none rounded-xl p-3 outline-none focus:ring-2 focus:ring-primary/20 resize-none"
              rows={3}
            />
            <div className="flex justify-end">
              <button 
                type="submit"
                disabled={saving || !novoAviso.trim()}
                className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg transition-all font-bold text-sm shadow flex items-center gap-2 disabled:opacity-50"
              >
                {saving ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
                Publicar Aviso
              </button>
            </div>
          </form>

          {/* List existing */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-700">Avisos Ativos ({avisos.length})</h3>
            {loading ? (
              <div className="flex justify-center p-4"><Loader2 className="animate-spin text-primary" /></div>
            ) : avisos.length === 0 ? (
              <p className="text-sm text-muted-foreground italic bg-white p-4 rounded-xl border text-center">Nenhum aviso ativo no momento.</p>
            ) : (
              avisos.map(aviso => (
                <div key={aviso.id} className="bg-white p-4 rounded-xl border shadow-sm flex items-start justify-between gap-4">
                  <div className="text-sm text-slate-800 whitespace-pre-wrap">{aviso.mensagem}</div>
                  <button 
                    onClick={() => handleDelete(aviso.id)}
                    className="text-destructive hover:bg-destructive/10 p-2 rounded-lg transition-colors shrink-0"
                    title="Remover Aviso"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AvisosModal;
