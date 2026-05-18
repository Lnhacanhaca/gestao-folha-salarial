import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Edit2, Trash2, UserPlus, Loader2 } from 'lucide-react';
import api from '../services/api';

const DocentesPage = () => {
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDocente, setEditingDocente] = useState(null);
  const [formData, setFormData] = useState({ nome: '', categoria: '', cursos: [1] });

  const queryClient = useQueryClient();

  const CURSOS_OPCOES = [
    { id: 1, nome: "Geral" },
    { id: 2, nome: "CA / CAP" },
    { id: 3, nome: "EM / EPM" },
    { id: 4, nome: "Informática (EI)" }
  ];

  const { data: docentes, isLoading } = useQuery({
    queryKey: ['docentes'],
    queryFn: async () => {
      const { data } = await api.get('/docentes');
      return data;
    }
  });

  const createMutation = useMutation({
    mutationFn: (newDocente) => api.post('/docentes', newDocente),
    onSuccess: () => {
      queryClient.invalidateQueries(['docentes']);
      closeModal();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.put(`/docentes/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['docentes']);
      closeModal();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/docentes/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['docentes']);
    }
  });

  const filteredDocentes = docentes?.filter(d => 
    d.nome?.toLowerCase().includes(search.toLowerCase())
  );

  const parseCursos = (cursosData) => {
    try {
      if (!cursosData) return [];
      let parsed = cursosData;
      if (typeof cursosData === 'string') {
        if (cursosData.includes(',') && !cursosData.includes('[')) {
          return cursosData.split(',').map(n => ({ id: parseInt(n.trim()), ap: 0 })).filter(c => !isNaN(c.id));
        }
        parsed = JSON.parse(cursosData);
      }
      if (Array.isArray(parsed)) {
        return parsed.map(c => {
          if (typeof c === 'number') return { id: c, ap: 0 };
          if (typeof c === 'object' && c.id) return { id: parseInt(c.id), ap: parseFloat(c.ap) || 0 };
          return null;
        }).filter(Boolean);
      }
      if (typeof parsed === 'number') return [{ id: parsed, ap: 0 }];
      return [];
    } catch {
      return [];
    }
  };

  const openModal = (docente = null) => {
    if (docente) {
      setEditingDocente(docente);
      setFormData({ 
        nome: docente.nome, 
        categoria: docente.categoria || '',
        cursos: parseCursos(docente.cursos)
      });
    } else {
      setEditingDocente(null);
      setFormData({ nome: '', categoria: '', cursos: [2, 3, 4] }); // default check all specific courses
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingDocente(null);
    setFormData({ nome: '', categoria: '', cursos: [] });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.cursos.length === 0) {
      alert("Selecione pelo menos um curso.");
      return;
    }
    if (editingDocente) {
      updateMutation.mutate({ id: editingDocente.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id) => {
    if (window.confirm('Tem certeza que deseja remover este docente?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleCursoToggle = (cursoId) => {
    setFormData(prev => {
      const exists = prev.cursos.find(c => c.id === cursoId);
      if (exists) {
        return { ...prev, cursos: prev.cursos.filter(c => c.id !== cursoId) };
      } else {
        return { ...prev, cursos: [...prev.cursos, { id: cursoId, ap: 0 }] };
      }
    });
  };

  const handleApChange = (cursoId, apValue) => {
    setFormData(prev => ({
      ...prev,
      cursos: prev.cursos.map(c => c.id === cursoId ? { ...c, ap: parseFloat(apValue) || 0 } : c)
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Docentes</h1>
          <p className="text-muted-foreground">Gestão unificada de professores do Curso Nocturno</p>
        </div>

        <button 
          onClick={() => openModal()}
          className="bg-primary hover:bg-primary/90 text-white px-6 py-2 rounded-lg transition-all flex items-center gap-2 font-bold shadow-lg shadow-primary/20"
        >
          <UserPlus size={20} />
          Novo Docente
        </button>
      </div>

      <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
        <div className="p-4 border-b flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 text-muted-foreground" size={18} />
            <input 
              type="text" 
              placeholder="Pesquisar docente..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-secondary/50 border-none rounded-xl py-2 pl-10 pr-4 outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-muted/50 border-b text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <th className="p-4">Nome do Docente</th>
                <th className="p-4">Categoria</th>
                <th className="p-4">Cursos Lecionados</th>
                <th className="p-4 text-center">Acções</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="p-12 text-center">
                    <Loader2 className="animate-spin inline-block mr-2" /> Carregando...
                  </td>
                </tr>
              ) : filteredDocentes?.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-12 text-center text-muted-foreground">
                    Nenhum docente encontrado.
                  </td>
                </tr>
              ) : filteredDocentes?.map((d) => {
                const cursosArray = parseCursos(d.cursos);
                return (
                  <tr key={d.id} className="hover:bg-muted/20 transition-colors">
                    <td className="p-4 font-medium">{d.nome}</td>
                    <td className="p-4 text-muted-foreground">{d.categoria || 'N/A'}</td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {cursosArray.map(cData => {
                          const c = CURSOS_OPCOES.find(opt => opt.id === cData.id);
                          return c ? (
                            <span key={cData.id} className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-1 rounded-md" title={`Horas Programadas (AP): ${cData.ap || 0}`}>
                              {c.nome} {cData.ap > 0 && `(${cData.ap}h)`}
                            </span>
                          ) : null;
                        })}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => openModal(d)}
                          className="p-2 hover:bg-primary/10 text-primary rounded-lg transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(d.id)}
                          className="p-2 hover:bg-destructive/10 text-destructive rounded-lg transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b">
              <h2 className="text-2xl font-bold">{editingDocente ? 'Editar Docente' : 'Novo Docente'}</h2>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nome Completo</label>
                <input 
                  type="text" 
                  value={formData.nome}
                  onChange={e => setFormData({...formData, nome: e.target.value})}
                  className="w-full bg-secondary/50 border-none rounded-xl p-3 outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Ex: João da Silva"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Categoria</label>
                <input 
                  type="text" 
                  value={formData.categoria}
                  onChange={e => setFormData({...formData, categoria: e.target.value})}
                  className="w-full bg-secondary/50 border-none rounded-xl p-3 outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Ex: Assistente, Professor Auxiliar..."
                />
              </div>

              <div className="space-y-2 pt-2">
                <label className="text-sm font-medium">Cursos Lecionados & Horas (AP/Semanal)</label>
                <div className="grid grid-cols-1 gap-2 mt-1">
                  {CURSOS_OPCOES.filter(c => c.id !== 1).map(curso => {
                    const isChecked = formData.cursos.find(c => c.id === curso.id);
                    return (
                      <div key={curso.id} className={`flex flex-col sm:flex-row sm:items-center gap-2 p-2 rounded-lg transition-colors border border-transparent ${isChecked ? 'bg-primary/5 border-primary/20' : 'bg-secondary/30 hover:bg-secondary/50'}`}>
                        <label className="flex items-center gap-2 cursor-pointer flex-1">
                          <input 
                            type="checkbox" 
                            checked={!!isChecked}
                            onChange={() => handleCursoToggle(curso.id)}
                            className="rounded text-primary focus:ring-primary"
                          />
                          <span className="text-sm font-medium">{curso.nome}</span>
                        </label>
                        {isChecked && (
                          <div className="flex items-center gap-2 ml-6 sm:ml-0 animate-in fade-in slide-in-from-right-4 duration-200">
                            <span className="text-xs text-muted-foreground font-semibold">AP:</span>
                            <input 
                              type="number" 
                              value={isChecked.ap || ''}
                              onChange={(e) => handleApChange(curso.id, e.target.value)}
                              placeholder="0"
                              min="0"
                              className="w-16 bg-background border rounded-md p-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/50 text-center font-bold"
                            />
                            <span className="text-xs text-muted-foreground">h/semana</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4">
                <button 
                  type="button" 
                  onClick={closeModal}
                  className="px-4 py-2 text-muted-foreground hover:bg-secondary/50 rounded-lg transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="bg-primary hover:bg-primary/90 text-white px-6 py-2 rounded-lg transition-all font-bold shadow-lg shadow-primary/20 flex items-center gap-2"
                >
                  {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="animate-spin" size={16} />}
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocentesPage;
