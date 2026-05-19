import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserPlus, Shield, User, Loader2, Edit2, Trash2, X, Save, Key, BookOpen } from 'lucide-react';
import api from '../services/api';

const UsuariosPage = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'USER',
    curso_id: 2
  });

  // Fetch Users
  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data } = await api.get('/users');
      return data;
    }
  });

  // Create User Mutation
  const createMutation = useMutation({
    mutationFn: (newUser) => api.post('/users', newUser),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      closeModal();
      alert('Utilizador criado com sucesso!');
    },
    onError: (err) => {
      alert('Erro ao criar utilizador: ' + (err.response?.data?.error?.message || err.message));
    }
  });

  // Update User Mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.put(`/users/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      closeModal();
      alert('Utilizador atualizado com sucesso!');
    },
    onError: (err) => {
      alert('Erro ao atualizar utilizador: ' + (err.response?.data?.error?.message || err.message));
    }
  });

  // Delete User Mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      alert('Utilizador removido com sucesso!');
    },
    onError: (err) => {
      alert('Erro ao remover utilizador: ' + (err.response?.data?.error?.message || err.message));
    }
  });

  const openModal = (user = null) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        username: user.username,
        password: '', // leave empty when editing unless changing password
        role: user.role,
        curso_id: user.curso_id || 2
      });
    } else {
      setEditingUser(null);
      setFormData({
        username: '',
        password: '',
        role: 'USER',
        curso_id: 2
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.username.trim()) {
      alert('Por favor introduza o nome de utilizador.');
      return;
    }

    if (!editingUser && !formData.password) {
      alert('Por favor introduza uma palavra-passe.');
      return;
    }

    const payload = {
      username: formData.username.trim(),
      role: formData.role,
      curso_id: formData.role === 'ADMIN' ? null : parseInt(formData.curso_id)
    };

    if (formData.password) {
      payload.password = formData.password;
    }

    if (editingUser) {
      updateMutation.mutate({ id: editingUser.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDelete = (id) => {
    if (window.confirm('Tem certeza que deseja remover este utilizador? Esta ação não pode ser desfeita.')) {
      deleteMutation.mutate(id);
    }
  };

  const CURSOS_NOMES = {
    2: "Contabilidade e Auditoria",
    3: "Contabilidade e Administração Pública",
    4: "Engenharia de Minas",
    5: "Engenharia de Processamento Mineral",
    6: "Engenharia Informática"
  };

  // Mapping: curso_id => courses managed in dashboard (same logic as Dashboard.jsx)
  const CURSOS_GERIDOS_LABEL = {
    2: "Contabilidade e Auditoria + Contabilidade e Administração Pública",
    3: "Contabilidade e Auditoria + Contabilidade e Administração Pública",
    4: "Engenharia de Minas + Processamento Mineral",
    5: "Engenharia de Minas + Processamento Mineral",
    6: "Engenharia Informática"
  };

  const CURSOS_OPCOES = [
    { value: 2, label: "Director de Contabilidade e Auditoria", detail: "Gere: Contabilidade e Auditoria + Contabilidade e Administração Pública" },
    { value: 4, label: "Director de Engenharia de Minas", detail: "Gere: Engenharia de Minas + Processamento Mineral" },
    { value: 6, label: "Director de Engenharia Informática", detail: "Gere: Engenharia Informática" }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Utilizadores</h1>
          <p className="text-muted-foreground">Gerir Directores de Curso e Administradores</p>
        </div>

        <button 
          onClick={() => openModal()}
          className="bg-primary hover:bg-primary/90 text-white px-6 py-2.5 rounded-xl transition-all flex items-center gap-2 font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98]"
        >
          <UserPlus size={20} />
          Criar Utilizador
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full flex justify-center p-20">
            <Loader2 className="animate-spin text-primary" size={40} />
          </div>
        ) : users?.map((u) => (
          <div key={u.id} className="bg-card p-6 rounded-3xl border shadow-sm space-y-4 hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-primary/10 to-transparent rounded-bl-full pointer-events-none transition-transform group-hover:scale-110" />
            
            <div className="flex items-start justify-between relative z-10">
              <div className="w-12 h-12 bg-secondary rounded-2xl flex items-center justify-center text-primary shadow-sm border">
                {u.role === 'ADMIN' ? <Shield size={24} /> : <User size={24} />}
              </div>
              <span className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase ${
                u.role === 'ADMIN' ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-secondary text-muted-foreground border'
              }`}>
                {u.role === 'ADMIN' ? 'Administrador' : 'Director de Curso'}
              </span>
            </div>
            
            <div className="space-y-1 relative z-10">
              <h3 className="font-bold text-lg leading-tight">{u.username}</h3>
              {u.role !== 'ADMIN' && (
                <div className="mt-3 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-primary/80 uppercase tracking-wider">
                    <BookOpen size={12} className="shrink-0" />
                    <span>Cursos que gere</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed pl-0.5">
                    {CURSOS_GERIDOS_LABEL[u.curso_id] || CURSOS_NOMES[u.curso_id] || `Curso ID: ${u.curso_id}`}
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pt-2 relative z-10">
              <button 
                onClick={() => openModal(u)}
                className="flex-1 py-2 rounded-xl border font-bold text-sm bg-background hover:bg-secondary/40 transition-colors flex items-center justify-center gap-1.5"
              >
                <Edit2 size={14} />
                Editar
              </button>
              <button 
                onClick={() => handleDelete(u.id)}
                className="p-2 rounded-xl border border-destructive/20 text-destructive hover:bg-destructive/10 transition-colors"
                title="Remover Utilizador"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Glassmorphic Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-md rounded-3xl border shadow-2xl p-6 relative overflow-hidden max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <button 
              onClick={closeModal}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-secondary/50 transition-colors"
            >
              <X size={20} />
            </button>

            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              {editingUser ? <Edit2 className="text-primary" size={22} /> : <UserPlus className="text-primary" size={22} />}
              {editingUser ? 'Editar Utilizador' : 'Criar Utilizador'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nome de Utilizador</label>
                <input 
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="Ex: lucas.simoco"
                  className="w-full bg-background border rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-primary/20 font-medium"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center justify-between">
                  <span>Palavra-passe</span>
                  {editingUser && <span className="text-[10px] text-muted-foreground italic font-normal">(Deixe em branco para não alterar)</span>}
                </label>
                <div className="relative">
                  <input 
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder={editingUser ? "••••••••" : "Introduza a palavra-passe"}
                    className="w-full bg-background border rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-primary/20 font-medium"
                    required={!editingUser}
                  />
                  <Key size={16} className="absolute right-3.5 top-3.5 text-muted-foreground" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Nível de Acesso (Função)</label>
                <div className="grid grid-cols-2 gap-2">
                  <label className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all text-center ${
                    formData.role === 'USER' ? 'border-primary bg-primary/5' : 'border-muted hover:border-primary/30 bg-background'
                  }`}>
                    <input type="radio" name="role" value="USER" checked={formData.role === 'USER'}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      className="hidden"
                    />
                    <User size={22} className={formData.role === 'USER' ? 'text-primary' : 'text-muted-foreground'} />
                    <span className={`text-xs font-bold ${formData.role === 'USER' ? 'text-primary' : 'text-muted-foreground'}`}>Director de Curso</span>
                  </label>
                  <label className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all text-center ${
                    formData.role === 'ADMIN' ? 'border-primary bg-primary/5' : 'border-muted hover:border-primary/30 bg-background'
                  }`}>
                    <input type="radio" name="role" value="ADMIN" checked={formData.role === 'ADMIN'}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      className="hidden"
                    />
                    <Shield size={22} className={formData.role === 'ADMIN' ? 'text-primary' : 'text-muted-foreground'} />
                    <span className={`text-xs font-bold ${formData.role === 'ADMIN' ? 'text-primary' : 'text-muted-foreground'}`}>Administrador Geral</span>
                  </label>
                </div>
              </div>

              {formData.role === 'USER' && (
                <div className="space-y-3 animate-in slide-in-from-top-2 duration-200">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <BookOpen size={14} className="text-primary" />
                    Área / Curso que vai gerir
                  </label>
                  <div className="grid grid-cols-1 gap-2">
                    {CURSOS_OPCOES.map(opt => (
                      <label key={opt.value} className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                        formData.curso_id === opt.value ? 'border-primary bg-primary/5' : 'border-muted hover:border-primary/30 bg-background'
                      }`}>
                        <input
                          type="radio"
                          name="curso_id"
                          value={opt.value}
                          checked={formData.curso_id === opt.value}
                          onChange={() => setFormData({ ...formData, curso_id: opt.value })}
                          className="mt-0.5 accent-primary"
                        />
                        <div>
                          <p className={`text-xs font-bold ${formData.curso_id === opt.value ? 'text-primary' : 'text-foreground'}`}>{opt.label}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{opt.detail}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t">
                <button 
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 rounded-xl border hover:bg-secondary font-bold text-sm transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="px-6 py-2 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/90 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  {createMutation.isPending || updateMutation.isPending ? (
                    <Loader2 className="animate-spin" size={16} />
                  ) : (
                    <Save size={16} />
                  )}
                  {editingUser ? 'Gravar Alterações' : 'Criar Utilizador'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsuariosPage;
