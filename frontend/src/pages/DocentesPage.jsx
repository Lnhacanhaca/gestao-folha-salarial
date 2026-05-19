import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Edit2, Trash2, UserPlus, Loader2, Upload } from 'lucide-react';
import api from '../services/api';
import Papa from 'papaparse';

const DocentesPage = () => {
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDocente, setEditingDocente] = useState(null);
  const [formData, setFormData] = useState({ nome: '', categoria: '', cursos: [1] });
  const [importing, setImporting] = useState(false);

  const queryClient = useQueryClient();

  const handleCSVImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImporting(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        if (results.data.length === 0) {
          alert('O ficheiro CSV está vazio ou inválido.');
          setImporting(false);
          return;
        }

        try {
          const promises = results.data.map(async (row) => {
            const keys = Object.keys(row);
            const nameKey = keys.find(k => k.toLowerCase().includes('nome') || k.toLowerCase().includes('docente') || k.toLowerCase() === 'docentes');
            if (!nameKey || !row[nameKey]) return null;

            const catKey = keys.find(k => k.toLowerCase().includes('categ') || k.toLowerCase().includes('grau'));
            const categoria = catKey ? row[catKey] : '';

            const cursosKey = keys.find(k => k.toLowerCase().includes('curso') || k.toLowerCase().includes('leciona'));
            const apKey = keys.find(k => k.toLowerCase().includes('ap') || k.toLowerCase().includes('hora') || k.toLowerCase().includes('prog') || k.toLowerCase().includes('carga'));
            const apVal = apKey ? parseFloat(row[apKey]) || 0 : 0;
            let cursosArray = [
              { id: 2, ap: apVal },
              { id: 3, ap: apVal },
              { id: 4, ap: apVal },
              { id: 5, ap: apVal },
              { id: 6, ap: apVal }
            ];
            
            if (cursosKey && row[cursosKey]) {
              const val = row[cursosKey].toLowerCase();
              const parsed = [];
              if (val.includes('auditoria') || val.includes('ca')) {
                parsed.push({ id: 2, ap: apVal });
              } else if (val.includes('pública') || val.includes('publica') || val.includes('cap') || val.includes('administra')) {
                parsed.push({ id: 3, ap: apVal });
              } else if (val.includes('contab')) {
                parsed.push({ id: 2, ap: apVal });
                parsed.push({ id: 3, ap: apVal });
              }

              if (val.includes('minas') || val.includes('em')) {
                parsed.push({ id: 4, ap: apVal });
              } else if (val.includes('processa') || val.includes('epm') || val.includes('mineral')) {
                parsed.push({ id: 5, ap: apVal });
              }

              if (val.includes('inf') || val.includes('ei')) {
                parsed.push({ id: 6, ap: apVal });
              }
              if (parsed.length > 0) cursosArray = parsed;
            }

            return api.post('/docentes', {
              nome: row[nameKey].trim(),
              categoria: (categoria || '').trim(),
              cursos: cursosArray
            });
          });

          await Promise.all(promises.filter(Boolean));
          alert('Docentes importados com sucesso!');
          queryClient.invalidateQueries(['docentes']);
        } catch (err) {
          alert('Erro ao importar docentes: ' + err.message);
        } finally {
          setImporting(false);
          e.target.value = null;
        }
      },
      error: (err) => {
        alert('Erro ao ler ficheiro CSV: ' + err.message);
        setImporting(false);
      }
    });
  };

  const CURSOS_OPCOES = [
    { id: 1, nome: "Geral" },
    { id: 2, nome: "Contabilidade e Auditoria" },
    { id: 3, nome: "Contabilidade e Administração Pública" },
    { id: 4, nome: "Engenharia de Minas" },
    { id: 5, nome: "Engenharia de Processamento Mineral" },
    { id: 6, nome: "Engenharia Informática" }
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

  const clearMutation = useMutation({
    mutationFn: () => api.delete('/docentes/bulk/clear'),
    onSuccess: () => {
      queryClient.invalidateQueries(['docentes']);
    }
  });

  const handleClearAll = () => {
    if (window.confirm('ATENÇÃO: Tem certeza que deseja eliminar TODOS os docentes cadastrados? Esta ação não pode ser desfeita.')) {
      clearMutation.mutate();
    }
  };

  const filteredDocentes = docentes?.filter(d => 
    d.nome?.toLowerCase().includes(search.toLowerCase())
  );

  const parseCursos = (cursosData) => {
    try {
      if (!cursosData) return [];
      let parsed = cursosData;
      if (typeof cursosData === 'string') {
        if (cursosData.includes(',') && !cursosData.includes('[')) {
          return cursosData.split(',').map(n => ({ id: parseInt(n.trim()), ap: 0, semestre: 1 })).filter(c => !isNaN(c.id));
        }
        parsed = JSON.parse(cursosData);
      }
      if (Array.isArray(parsed)) {
        return parsed.map(c => {
          if (typeof c === 'number') return { id: c, ap: 0, semestre: 1 };
          if (typeof c === 'object' && c.id) return { id: parseInt(c.id), ap: parseFloat(c.ap) || 0, semestre: parseInt(c.semestre) || 1 };
          return null;
        }).filter(Boolean);
      }
      if (typeof parsed === 'number') return [{ id: parsed, ap: 0, semestre: 1 }];
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
      setFormData({ nome: '', categoria: '', cursos: [{ id: 2, ap: 0, semestre: 1 }, { id: 3, ap: 0, semestre: 1 }, { id: 4, ap: 0, semestre: 1 }, { id: 5, ap: 0, semestre: 1 }, { id: 6, ap: 0, semestre: 1 }] });
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
        return { ...prev, cursos: [...prev.cursos, { id: cursoId, ap: 0, semestre: 1 }] };
      }
    });
  };

  const handleApChange = (cursoId, apValue) => {
    setFormData(prev => ({
      ...prev,
      cursos: prev.cursos.map(c => c.id === cursoId ? { ...c, ap: parseFloat(apValue) || 0 } : c)
    }));
  };

  const handleSemestreChange = (cursoId, semestreValue) => {
    setFormData(prev => ({
      ...prev,
      cursos: prev.cursos.map(c => c.id === cursoId ? { ...c, semestre: parseInt(semestreValue) || 1 } : c)
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Docentes</h1>
          <p className="text-muted-foreground">Gestão unificada de professores do Curso Nocturno</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className={`bg-secondary hover:bg-secondary/80 text-foreground px-6 py-2 rounded-lg cursor-pointer transition-all flex items-center gap-2 font-bold shadow-sm ${importing ? 'opacity-50 pointer-events-none' : ''}`}>
            {importing ? <Loader2 className="animate-spin" size={20} /> : <Upload size={20} />}
            Importar CSV
            <input type="file" accept=".csv" onChange={handleCSVImport} className="hidden" disabled={importing} />
          </label>

          <button 
            onClick={() => openModal()}
            className="bg-primary hover:bg-primary/90 text-white px-6 py-2 rounded-lg transition-all flex items-center gap-2 font-bold shadow-lg shadow-primary/20"
          >
            <UserPlus size={20} />
            Novo Docente
          </button>

          {docentes && docentes.length > 0 && (
            <button 
              onClick={handleClearAll}
              className="bg-destructive hover:bg-destructive/90 text-white px-6 py-2 rounded-lg transition-all flex items-center gap-2 font-bold shadow-lg shadow-destructive/20"
            >
              <Trash2 size={20} />
              Eliminar Tudo
            </button>
          )}
        </div>
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
          <table className="w-full text-left min-w-[750px]">
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
                            <span key={cData.id} className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-1 rounded-md" title={`Horas Programadas (AP): ${cData.ap || 0} - Semestre: ${cData.semestre || 1}`}>
                              {c.nome} {cData.ap > 0 && `(${cData.ap}h)`} <span className="text-muted-foreground font-normal">({cData.semestre || 1}º Sem)</span>
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
          <div className="bg-card w-full max-w-md rounded-2xl shadow-xl overflow-hidden max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
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
                          <div className="flex flex-wrap items-center gap-3 ml-6 sm:ml-0 animate-in fade-in slide-in-from-right-4 duration-200">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-muted-foreground font-semibold">AP:</span>
                              <input 
                                type="number" 
                                value={isChecked.ap || ''}
                                onChange={(e) => handleApChange(curso.id, e.target.value)}
                                placeholder="0"
                                min="0"
                                className="w-14 bg-background border rounded-md p-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/50 text-center font-bold"
                              />
                              <span className="text-xs text-muted-foreground">h/semana</span>
                            </div>

                            <div className="flex bg-secondary p-0.5 rounded-lg border text-xs">
                              <button
                                type="button"
                                onClick={() => handleSemestreChange(curso.id, 1)}
                                className={`px-2 py-1 rounded-md font-bold transition-all ${
                                  (isChecked.semestre || 1) === 1 
                                    ? 'bg-primary text-white shadow-sm' 
                                    : 'text-muted-foreground hover:text-foreground'
                                }`}
                              >
                                1º Sem
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSemestreChange(curso.id, 2)}
                                className={`px-2 py-1 rounded-md font-bold transition-all ${
                                  isChecked.semestre === 2 
                                    ? 'bg-primary text-white shadow-sm' 
                                    : 'text-muted-foreground hover:text-foreground'
                                }`}
                              >
                                2º Sem
                              </button>
                            </div>
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
