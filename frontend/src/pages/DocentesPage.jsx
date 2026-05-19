import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Edit2, Trash2, UserPlus, Loader2, Upload, Download } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../services/api';
import Papa from 'papaparse';
import { useAuth } from '../context/AuthContext';
import { getManagedCourseIds } from '../lib/cursos';

const DocentesPage = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const managedIds = getManagedCourseIds(user);

  const [search, setSearch] = useState('');
  const [filterCurso, setFilterCurso] = useState('all');
  const [filterSemestre, setFilterSemestre] = useState('all');
  const [filterHoras, setFilterHoras] = useState('all');
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
          toast.error('O ficheiro CSV está vazio ou inválido.');
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
              { id: 2, ap: apVal, semestre: 1 },
              { id: 2, ap: apVal, semestre: 2 },
              { id: 3, ap: apVal, semestre: 1 },
              { id: 3, ap: apVal, semestre: 2 },
              { id: 4, ap: apVal, semestre: 1 },
              { id: 4, ap: apVal, semestre: 2 },
              { id: 5, ap: apVal, semestre: 1 },
              { id: 5, ap: apVal, semestre: 2 },
              { id: 6, ap: apVal, semestre: 1 },
              { id: 6, ap: apVal, semestre: 2 }
            ];
            
            if (cursosKey && row[cursosKey]) {
              const val = row[cursosKey].toLowerCase();
              const parsed = [];
              if (val.includes('auditoria') || val.includes('ca')) {
                parsed.push({ id: 2, ap: apVal, semestre: 1 });
                parsed.push({ id: 2, ap: apVal, semestre: 2 });
              } else if (val.includes('pública') || val.includes('publica') || val.includes('cap') || val.includes('administra')) {
                parsed.push({ id: 3, ap: apVal, semestre: 1 });
                parsed.push({ id: 3, ap: apVal, semestre: 2 });
              } else if (val.includes('contab')) {
                parsed.push({ id: 2, ap: apVal, semestre: 1 });
                parsed.push({ id: 2, ap: apVal, semestre: 2 });
                parsed.push({ id: 3, ap: apVal, semestre: 1 });
                parsed.push({ id: 3, ap: apVal, semestre: 2 });
              }

              if (val.includes('minas') || val.includes('em')) {
                parsed.push({ id: 4, ap: apVal, semestre: 1 });
                parsed.push({ id: 4, ap: apVal, semestre: 2 });
              } else if (val.includes('processa') || val.includes('epm') || val.includes('mineral')) {
                parsed.push({ id: 5, ap: apVal, semestre: 1 });
                parsed.push({ id: 5, ap: apVal, semestre: 2 });
              }

              if (val.includes('inf') || val.includes('ei')) {
                parsed.push({ id: 6, ap: apVal, semestre: 1 });
                parsed.push({ id: 6, ap: apVal, semestre: 2 });
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
          toast.success('Docentes importados com sucesso!');
          queryClient.invalidateQueries(['docentes']);
        } catch (err) {
          toast.error('Erro ao importar docentes: ' + err.message);
        } finally {
          setImporting(false);
          e.target.value = null;
        }
      },
      error: (err) => {
        toast.error('Erro ao ler ficheiro CSV: ' + err.message);
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
      toast.success('Docente cadastrado com sucesso!');
    },
    onError: (err) => toast.error('Erro ao cadastrar docente: ' + (err.response?.data?.error?.message || err.message))
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.put(`/docentes/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['docentes']);
      closeModal();
      toast.success('Docente atualizado com sucesso!');
    },
    onError: (err) => toast.error('Erro ao atualizar docente: ' + (err.response?.data?.error?.message || err.message))
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/docentes/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['docentes']);
      toast.success('Docente removido com sucesso!');
    },
    onError: (err) => toast.error('Erro ao remover docente: ' + (err.response?.data?.error?.message || err.message))
  });

  const clearMutation = useMutation({
    mutationFn: () => api.delete('/docentes/bulk/clear'),
    onSuccess: () => {
      queryClient.invalidateQueries(['docentes']);
      toast.success('Todos os docentes foram eliminados.');
    },
    onError: (err) => toast.error('Erro ao limpar docentes: ' + (err.response?.data?.error?.message || err.message))
  });

  const handleClearAll = () => {
    toast((t) => (
      <div className="flex flex-col gap-3">
        <p className="font-medium text-destructive">ATENÇÃO: Tem certeza que deseja eliminar TODOS os docentes cadastrados? Esta ação não pode ser desfeita.</p>
        <div className="flex justify-end gap-2 mt-2">
          <button onClick={() => toast.dismiss(t.id)} className="px-3 py-1.5 text-xs font-bold bg-secondary hover:bg-secondary/80 rounded-lg transition-colors border">Cancelar</button>
          <button onClick={() => {
            toast.dismiss(t.id);
            clearMutation.mutate();
          }} className="px-3 py-1.5 text-xs font-bold bg-destructive hover:bg-destructive/90 text-white rounded-lg transition-colors shadow-sm">Sim, eliminar todos</button>
        </div>
      </div>
    ), { duration: Infinity, style: { minWidth: '350px' } });
  };

  const filteredDocentes = docentes?.filter(d => {
    const cursosArray = parseCursos(d.cursos);

    // Filter by managed courses if not admin
    if (!isAdmin) {
      const hasManagedCourse = cursosArray.some(c => managedIds.includes(c.id));
      if (!hasManagedCourse) return false;
    }

    // 1. Filter by search name
    if (search && !d.nome?.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }

    // 2. Filter by course
    if (filterCurso !== 'all') {
      const targetId = parseInt(filterCurso);
      const hasCourse = cursosArray.some(c => c.id === targetId);
      if (!hasCourse) return false;
    }

    // 3. Filter by semester
    if (filterSemestre !== 'all') {
      const targetSem = parseInt(filterSemestre);
      const hasSem = cursosArray.some(c => {
        const matchesSem = c.semestre === targetSem;
        if (filterCurso !== 'all') {
          return matchesSem && c.id === parseInt(filterCurso);
        }
        return matchesSem;
      });
      if (!hasSem) return false;
    }

    // 4. Filter by hours range
    if (filterHoras !== 'all') {
      const matchingCursos = cursosArray.filter(c => {
        let ok = true;
        if (filterCurso !== 'all') ok = ok && c.id === parseInt(filterCurso);
        if (filterSemestre !== 'all') ok = ok && c.semestre === parseInt(filterSemestre);
        return ok;
      });

      const totalAp = matchingCursos.reduce((acc, c) => acc + (c.ap || 0), 0);

      if (filterHoras === 'zero') {
        if (totalAp !== 0) return false;
      } else if (filterHoras === 'low') {
        if (totalAp <= 0 || totalAp > 10) return false;
      } else if (filterHoras === 'medium') {
        if (totalAp < 11 || totalAp > 20) return false;
      } else if (filterHoras === 'high') {
        if (totalAp <= 20) return false;
      }
    }

    return true;
  });

  function parseCursos(cursosData) {
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
      toast.error("Selecione pelo menos um curso.");
      return;
    }
    if (editingDocente) {
      updateMutation.mutate({ id: editingDocente.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id) => {
    toast((t) => (
      <div className="flex flex-col gap-3">
        <p className="font-medium">Tem certeza que deseja remover este docente?</p>
        <div className="flex justify-end gap-2 mt-2">
          <button onClick={() => toast.dismiss(t.id)} className="px-3 py-1.5 text-xs font-bold bg-secondary hover:bg-secondary/80 rounded-lg transition-colors border">Cancelar</button>
          <button onClick={() => {
            toast.dismiss(t.id);
            deleteMutation.mutate(id);
          }} className="px-3 py-1.5 text-xs font-bold bg-destructive hover:bg-destructive/90 text-white rounded-lg transition-colors shadow-sm">Sim, remover</button>
        </div>
      </div>
    ), { duration: Infinity, style: { minWidth: '300px' } });
  };

  const handleCSVExport = () => {
    if (!docentes || docentes.length === 0) {
      toast.error('Não existem docentes para exportar.');
      return;
    }

    const dataToExport = docentes.map(doc => {
      const parsedCursos = parseCursos(doc.cursos);
      const cursosFormatted = parsedCursos.map(c => {
        const cNome = CURSOS_OPCOES.find(o => o.id === c.id)?.nome || `Curso ID ${c.id}`;
        return `${cNome} (${c.ap}h - Semestre ${c.semestre})`;
      }).join('; ');

      return {
        'Nome do Docente': doc.nome,
        'Categoria': doc.categoria || '',
        'Cursos e Cargas Horárias': cursosFormatted
      };
    });

    const csv = Papa.unparse(dataToExport, { delimiter: ';' });
    const blob = new Blob(["\ufeff" + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `docentes_curso_nocturno_${new Date().getFullYear()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Docentes exportados com sucesso!');
  };

  const handleCursoToggle = (cursoId, semestre) => {
    setFormData(prev => {
      const exists = prev.cursos.find(c => c.id === cursoId && c.semestre === semestre);
      if (exists) {
        return { ...prev, cursos: prev.cursos.filter(c => !(c.id === cursoId && c.semestre === semestre)) };
      } else {
        return { ...prev, cursos: [...prev.cursos, { id: cursoId, ap: 0, semestre }] };
      }
    });
  };

  const handleApChange = (cursoId, semestre, apValue) => {
    setFormData(prev => ({
      ...prev,
      cursos: prev.cursos.map(c => (c.id === cursoId && c.semestre === semestre) ? { ...c, ap: parseFloat(apValue) || 0 } : c)
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Docentes</h1>
          <p className="text-muted-foreground">Gestão unificada de professores do Curso Nocturno</p>
        </div>

        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 w-full md:w-auto mt-4 md:mt-0">
          {isAdmin && (
            <label className={`w-full sm:w-auto justify-center bg-secondary hover:bg-secondary/80 text-foreground px-6 py-2 rounded-lg cursor-pointer transition-all flex items-center gap-2 font-bold shadow-sm ${importing ? 'opacity-50 pointer-events-none' : ''}`}>
              {importing ? <Loader2 className="animate-spin" size={20} /> : <Upload size={20} />}
              Importar CSV
              <input type="file" accept=".csv" onChange={handleCSVImport} className="hidden" disabled={importing} />
            </label>
          )}

          <button 
            onClick={handleCSVExport}
            className="w-full sm:w-auto justify-center bg-secondary hover:bg-secondary/80 text-foreground px-6 py-2 rounded-lg transition-all flex items-center gap-2 font-bold shadow-sm"
          >
            <Download size={20} />
            Exportar CSV
          </button>

          {isAdmin && (
            <button 
              onClick={() => openModal()}
              className="w-full sm:w-auto justify-center bg-primary hover:bg-primary/90 text-white px-6 py-2 rounded-lg transition-all flex items-center gap-2 font-bold shadow-lg shadow-primary/20"
            >
              <UserPlus size={20} />
              Novo Docente
            </button>
          )}

          {isAdmin && docentes && docentes.length > 0 && (
            <button 
              onClick={handleClearAll}
              className="w-full sm:w-auto justify-center bg-destructive hover:bg-destructive/90 text-white px-6 py-2 rounded-lg transition-all flex items-center gap-2 font-bold shadow-lg shadow-destructive/20"
            >
              <Trash2 size={20} />
              Eliminar Tudo
            </button>
          )}
        </div>
      </div>

      <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
        <div className="p-5 border-b bg-muted/20 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Filtros Avançados</span>
              {filteredDocentes && (
                <span className="bg-primary/10 text-primary text-[11px] font-black px-2 py-0.5 rounded-full">
                  {filteredDocentes.length} {filteredDocentes.length === 1 ? 'docente' : 'docentes'} encontrado(s)
                </span>
              )}
            </div>
            
            {(search || filterCurso !== 'all' || filterSemestre !== 'all' || filterHoras !== 'all') && (
              <button
                onClick={() => {
                  setSearch('');
                  setFilterCurso('all');
                  setFilterSemestre('all');
                  setFilterHoras('all');
                }}
                className="text-xs text-destructive hover:underline font-bold flex items-center gap-1"
              >
                Limpar Filtros
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-muted-foreground" size={18} />
              <input 
                type="text" 
                placeholder="Pesquisar docente por nome..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-secondary/50 border rounded-xl py-2 pl-10 pr-4 outline-none focus:ring-2 focus:ring-primary/20 text-xs font-medium"
              />
            </div>

            {/* Curso */}
            <div>
              <select
                value={filterCurso}
                onChange={(e) => setFilterCurso(e.target.value)}
                className="w-full bg-secondary/50 border rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-primary/20 text-xs font-medium cursor-pointer"
              >
                <option value="all">Todos os Cursos</option>
                {CURSOS_OPCOES.filter(c => c.id !== 1 && (isAdmin || managedIds.includes(c.id))).map(c => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>

            {/* Semestre */}
            <div>
              <select
                value={filterSemestre}
                onChange={(e) => setFilterSemestre(e.target.value)}
                className="w-full bg-secondary/50 border rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-primary/20 text-xs font-medium cursor-pointer"
              >
                <option value="all">Todos os Semestres</option>
                <option value="1">1º Semestre</option>
                <option value="2">2º Semestre</option>
              </select>
            </div>

            {/* Carga Horária */}
            <div>
              <select
                value={filterHoras}
                onChange={(e) => setFilterHoras(e.target.value)}
                className="w-full bg-secondary/50 border rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-primary/20 text-xs font-medium cursor-pointer"
              >
                <option value="all">Carga Horária (Qualquer)</option>
                <option value="zero">Sem Carga (0h)</option>
                <option value="low">Carga Baixa (1h - 10h)</option>
                <option value="medium">Carga Média (11h - 20h)</option>
                <option value="high">Carga Alta (&gt; 20h)</option>
              </select>
            </div>
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
                      {isAdmin ? (
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
                      ) : (
                        <div className="flex items-center justify-center">
                          <span className="text-[10px] uppercase font-bold text-muted-foreground bg-secondary/50 px-2 py-1 rounded-md">
                            Apenas Leitura
                          </span>
                        </div>
                      )}
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
                <label className="text-sm font-medium block mb-1">Cursos Lecionados & Horas (AP/Semanal)</label>
                <div className="grid grid-cols-1 gap-3 mt-1 max-h-[350px] overflow-y-auto pr-1">
                  {CURSOS_OPCOES.filter(c => c.id !== 1).map(curso => {
                    const isCheckedSem1 = formData.cursos.find(c => c.id === curso.id && c.semestre === 1);
                    const isCheckedSem2 = formData.cursos.find(c => c.id === curso.id && c.semestre === 2);
                    return (
                      <div key={curso.id} className="p-3 bg-secondary/20 rounded-xl border border-muted/50 space-y-2">
                        <span className="text-xs font-bold text-slate-800 block">{curso.nome}</span>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {/* 1º Semestre */}
                          <div className={`flex items-center justify-between p-2 rounded-lg border transition-colors ${isCheckedSem1 ? 'bg-primary/5 border-primary/20' : 'bg-background border-muted'}`}>
                            <label className="flex items-center gap-1.5 cursor-pointer select-none">
                              <input 
                                type="checkbox" 
                                checked={!!isCheckedSem1}
                                onChange={() => handleCursoToggle(curso.id, 1)}
                                className="rounded text-primary focus:ring-primary h-3.5 w-3.5"
                              />
                              <span className="text-[11px] font-bold text-slate-700">1º Semestre</span>
                            </label>
                            {isCheckedSem1 && (
                              <div className="flex items-center gap-1 ml-2 animate-in fade-in duration-200">
                                <span className="text-[10px] text-muted-foreground font-black">AP:</span>
                                <input 
                                  type="number" 
                                  value={isCheckedSem1.ap || ''}
                                  onChange={(e) => handleApChange(curso.id, 1, e.target.value)}
                                  placeholder="0"
                                  min="0"
                                  className="w-12 bg-background border rounded-md p-1 text-[11px] outline-none focus:ring-2 focus:ring-primary/50 text-center font-bold"
                                />
                                <span className="text-[10px] text-muted-foreground">h</span>
                              </div>
                            )}
                          </div>

                          {/* 2º Semestre */}
                          <div className={`flex items-center justify-between p-2 rounded-lg border transition-colors ${isCheckedSem2 ? 'bg-primary/5 border-primary/20' : 'bg-background border-muted'}`}>
                            <label className="flex items-center gap-1.5 cursor-pointer select-none">
                              <input 
                                type="checkbox" 
                                checked={!!isCheckedSem2}
                                onChange={() => handleCursoToggle(curso.id, 2)}
                                className="rounded text-primary focus:ring-primary h-3.5 w-3.5"
                              />
                              <span className="text-[11px] font-bold text-slate-700">2º Semestre</span>
                            </label>
                            {isCheckedSem2 && (
                              <div className="flex items-center gap-1 ml-2 animate-in fade-in duration-200">
                                <span className="text-[10px] text-muted-foreground font-black">AP:</span>
                                <input 
                                  type="number" 
                                  value={isCheckedSem2.ap || ''}
                                  onChange={(e) => handleApChange(curso.id, 2, e.target.value)}
                                  placeholder="0"
                                  min="0"
                                  className="w-12 bg-background border rounded-md p-1 text-[11px] outline-none focus:ring-2 focus:ring-primary/50 text-center font-bold"
                                />
                                <span className="text-[10px] text-muted-foreground">h</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-4">
                <button 
                  type="button" 
                  onClick={closeModal}
                  className="w-full sm:w-auto justify-center px-4 py-2 text-muted-foreground hover:bg-secondary/50 rounded-lg transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="w-full sm:w-auto justify-center bg-primary hover:bg-primary/90 text-white px-6 py-2 rounded-lg transition-all font-bold shadow-lg shadow-primary/20 flex items-center gap-2"
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
