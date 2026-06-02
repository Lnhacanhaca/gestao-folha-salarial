import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Loader2, UserPlus, Menu, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { getManagedCourseIds, LANCAR_COURSE_OPTIONS } from '../lib/cursos';
import { getHolidaysForMonth } from '../lib/holidays';

const getWeeksDateRanges = (mes, ano) => {
  const ranges = [];
  const firstDayOfMonth = new Date(ano, mes - 1, 1);
  const lastDayOfMonth = new Date(ano, mes, 0); // last day of current month
  let dayOfWeek = firstDayOfMonth.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  
  // Determine Monday of the week containing the 1st
  let diffToMonday = 1 - dayOfWeek;
  if (dayOfWeek === 0) diffToMonday = -6;
  
  const startMonday = new Date(firstDayOfMonth);
  startMonday.setDate(firstDayOfMonth.getDate() + diffToMonday);
  
  for (let w = 0; w < 5; w++) {
    let mon = new Date(startMonday);
    mon.setDate(startMonday.getDate() + (w * 7));
    
    let fri = new Date(mon);
    fri.setDate(mon.getDate() + 4);
    
    // Clamp Monday to the start of the month
    if (mon < firstDayOfMonth) {
      mon = new Date(firstDayOfMonth);
    }
    
    // Clamp Friday to the end of the month
    if (fri > lastDayOfMonth) {
      fri = new Date(lastDayOfMonth);
    }
    
    const monStr = String(mon.getDate()).padStart(2, '0') + '/' + String(mon.getMonth() + 1).padStart(2, '0');
    const friStr = String(fri.getDate()).padStart(2, '0') + '/' + String(fri.getMonth() + 1).padStart(2, '0') + '/' + fri.getFullYear();
    
    ranges.push(`${monStr} - ${friStr}`);
  }
  return ranges;
};

const isLaunchWindowOpen = (targetMes, targetAno) => {
  const now = new Date();
  const curDay = now.getDate();
  const curMonth = now.getMonth() + 1;
  const curYear = now.getFullYear();

  // Determine superior month and year
  let supMonth = targetMes + 1;
  let supYear = targetAno;
  if (supMonth === 13) {
    supMonth = 1;
    supYear = targetAno + 1;
  }

  return curYear === supYear && curMonth === supMonth && curDay >= 1 && curDay <= 15;
};

const formatarFaltas = (horasFalta) => {
  if (horasFalta <= 0) return "0h (0 faltas)";
  const numFaltas = horasFalta / 2;
  const faltasStr = Number.isInteger(numFaltas) ? numFaltas.toString() : numFaltas.toFixed(1);
  return `${horasFalta}h (${faltasStr} ${numFaltas === 1 ? 'falta' : 'faltas'})`;
};

const LancarNotasPage = () => {
  const { user } = useAuth();
  const [mes, setMes] = useState(() => {
    const saved = localStorage.getItem('sgfs_mes');
    if (saved) return parseInt(saved);
    const now = new Date();
    let m = now.getMonth() + 1;
    if (now.getDate() <= 15) {
      m = m - 1;
      if (m === 0) m = 12;
    }
    return m;
  });
  const [ano, setAno] = useState(() => {
    const saved = localStorage.getItem('sgfs_ano');
    if (saved) return parseInt(saved);
    const now = new Date();
    let m = now.getMonth() + 1;
    let y = now.getFullYear();
    if (now.getDate() <= 15) {
      m = m - 1;
      if (m === 0) y = y - 1;
    }
    return y;
  });
  const [cursoId, setCursoId] = useState(2);
  const [dados, setDados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [inputMode, setInputMode] = useState('individual'); // default to 'individual' mode
  const [selectedDocenteIndex, setSelectedDocenteIndex] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isExamMode, setIsExamMode] = useState(() => localStorage.getItem('sgfs_show_vigias') === 'true');
  const [showMobileList, setShowMobileList] = useState(false);
  const [hasException, setHasException] = useState(false);
  const [excecaoDetalhe, setExcecaoDetalhe] = useState(null);

  const checkExcecaoAtiva = async (fMes, fAno, fCursoId) => {
    if (fCursoId === 1) {
      setHasException(false);
      setExcecaoDetalhe(null);
      return;
    }
    try {
      const { data } = await api.get(`/folhas/excecao-ativa?curso_id=${fCursoId}&mes=${fMes}&ano=${fAno}`);
      setHasException(data.ativa);
      setExcecaoDetalhe(data.excecao);
    } catch (err) {
      console.error('Erro ao buscar exceção ativa:', err);
      setHasException(false);
      setExcecaoDetalhe(null);
    }
  };

  useEffect(() => {
    if (user) {
      const managedIds = getManagedCourseIds(user);
      const activeCursoId = user.role !== 'ADMIN' ? managedIds[0] : (parseInt(localStorage.getItem('sgfs_cursoId')) || managedIds[0] || 2);
      setCursoId(activeCursoId);
      fetchFolha(mes, ano, activeCursoId);
    }
  }, [user]);

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const currentDay = new Date().getDate();

  let prevMonth = currentMonth - 1;
  let prevYear = currentYear;
  if (prevMonth === 0) {
    prevMonth = 12;
    prevYear = currentYear - 1;
  }

  const isPreviousMonth = ano === prevYear && mes === prevMonth;
  const isRectificationPeriod = currentDay >= 5 && currentDay <= 20;
  const canEditPreviousMonth = isPreviousMonth && isRectificationPeriod;

  const isLaunchOpen = isLaunchWindowOpen(mes, ano);
  const isReadOnly = (user?.role !== 'ADMIN' && !isLaunchOpen && !hasException) || cursoId === 1;
  
  // Use a ref to access latest state inside the interval without restarting it
  const stateRef = React.useRef({ mes, ano, cursoId, dados });
  useEffect(() => {
    stateRef.current = { mes, ano, cursoId, dados };
  }, [mes, ano, cursoId, dados]);

  useEffect(() => {
    localStorage.setItem('sgfs_mes', mes);
    localStorage.setItem('sgfs_ano', ano);
    localStorage.setItem('sgfs_cursoId', cursoId);
    localStorage.setItem('sgfs_dados_folha', JSON.stringify(dados));
  }, [mes, ano, cursoId, dados]);

  // Auto-save every 30 seconds
  useEffect(() => {
    const timer = setInterval(async () => {
      const { mes, ano, cursoId, dados } = stateRef.current;
      if (dados.length > 0 && cursoId !== 1) {
        try {
          await api.post('/folhas/importar', { mes, ano, curso_id: cursoId, dados });
          setLastSaved(new Date());
        } catch (err) {
          console.error("Autosave failed", err);
        }
      }
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  const meses = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];



  const addDocente = () => {
    setDados([...dados, {
      docente_nome: '',
      semanas: Array(5).fill(0).map((_, i) => ({ semana: i + 1, ap: 0, ad: 0, vp: 0, vd: 0 }))
    }]);
  };

  const handleRemoveDocente = async (index) => {
    if (isReadOnly) return;
    const doc = dados[index];
    
    // If it's a new unsaved teacher, just remove from state
    if (!doc.docente_nome.trim() || (!doc.total_ad && !doc.semanas.some(s => s.ad > 0))) {
      setDados(dados.filter((_, i) => i !== index));
      return;
    }

    toast((t) => (
      <div className="flex flex-col gap-3">
        <p className="font-semibold text-destructive text-sm">
          Remover "{doc.docente_nome}"?
        </p>
        <p className="text-xs text-muted-foreground leading-normal">
          Isso apagará permanentemente todos os lançamentos de horas deste docente para este curso no mês {mes}/{ano}.
        </p>
        <div className="flex justify-end gap-2 mt-1">
          <button 
            onClick={() => toast.dismiss(t.id)} 
            className="px-3 py-1.5 text-xs font-bold bg-secondary hover:bg-secondary/80 rounded-lg transition-colors border"
          >
            Cancelar
          </button>
          <button 
            onClick={async () => {
              toast.dismiss(t.id);
              setLoading(true);
              try {
                await api.post(`/folhas/deletar-docente?mes=${mes}&ano=${ano}`, {
                  curso_id: cursoId,
                  docente_nome: doc.docente_nome
                });
                setDados(dados.filter((_, i) => i !== index));
                setLastSaved(new Date());
                toast.success(`Lançamento de "${doc.docente_nome}" removido com sucesso!`);
              } catch (err) {
                toast.error('Erro ao remover lançamento: ' + (err.response?.data?.error?.message || err.message));
              } finally {
                setLoading(false);
              }
            }} 
            className="px-3 py-1.5 text-xs font-bold bg-destructive hover:bg-destructive/90 text-white rounded-lg transition-colors shadow-sm"
          >
            Sim, apagar
          </button>
        </div>
      </div>
    ), { duration: Infinity, style: { minWidth: '350px' } });
  };

  const updateCell = (docIndex, weekIndex, field, value) => {
    const val = parseFloat(value) || 0;
    
    if (val < 0) {
      toast.error('Erro: As horas não podem ser valores negativos');
      return;
    }

    const newDados = [...dados];
    
    if (field === 'ad' && val > newDados[docIndex].semanas[weekIndex].ap) {
      toast.error('Erro: Aulas Dadas (AD) não podem ser maiores que Programadas (AP)');
      return;
    }
    
    if (field === 'vd' && val > newDados[docIndex].semanas[weekIndex].vp && newDados[docIndex].semanas[weekIndex].vp > 0 && val > newDados[docIndex].semanas[weekIndex].vp * 3) {
      // Allow VD > VP because "um docente pode vigiar a mais da hora que é programada", 
      // but if it's exceedingly large we might want to warn. We'll just allow it.
    }

    newDados[docIndex].semanas[weekIndex][field] = val;

    // Recalculate row totals
    const row = newDados[docIndex];
    row.total_ap = row.semanas.reduce((acc, s) => acc + (parseFloat(s.ap) || 0), 0);
    row.total_ad = row.semanas.reduce((acc, s) => acc + (parseFloat(s.ad) || 0), 0);
    row.total_vp = row.semanas.reduce((acc, s) => acc + (parseFloat(s.vp) || 0), 0);
    row.total_vd = row.semanas.reduce((acc, s) => acc + (parseFloat(s.vd) || 0), 0);
    row.valor_receber = (row.total_ad + row.total_vd) * 500;

    if (canEditPreviousMonth) {
      row.retificada = true;
      row.observacoes = "Alterado na retificação (Auditória)";
    }
    setDados(newDados);
  };

  const handleSaveDocente = async (index) => {
    if (isReadOnly) return;
    const doc = dados[index];
    if (!doc.docente_nome.trim()) {
      toast.error('Erro: O nome do docente não pode estar vazio.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/folhas/importar', {
        mes,
        ano,
        curso_id: cursoId,
        dados: [doc]
      });
      setLastSaved(new Date());
      toast.success(`Dados do docente "${doc.docente_nome}" salvos com sucesso!`);
    } catch (err) {
      toast.error('Erro ao salvar docente: ' + (err.response?.data?.error?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (isReadOnly) return;
    setLoading(true);
    try {
      await api.post('/folhas/importar', {
        mes,
        ano,
        curso_id: cursoId,
        dados
      });
      setLastSaved(new Date());
      toast.success('Dados salvos com sucesso!');
    } catch (err) {
      toast.error('Erro ao salvar dados: ' + (err.response?.data?.error?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const fetchFolha = async (fMes, fAno, fCursoId) => {
    try {
      setLoading(true);
      await checkExcecaoAtiva(fMes, fAno, fCursoId);
      
      // 1. Fetch teachers from Docentes database
      const { data: docentes } = await api.get('/docentes');
      
      // Filter docentes assigned to this course
      const courseDocentes = docentes.filter(doc => {
        if (fCursoId === 1) return true; // Geral includes all
        try {
          let cursosArray = [];
          if (typeof doc.cursos === 'string') {
            const parsed = JSON.parse(doc.cursos);
            cursosArray = Array.isArray(parsed) ? parsed : [parsed];
          } else if (Array.isArray(doc.cursos)) {
            cursosArray = doc.cursos;
          } else if (typeof doc.cursos === 'number') {
            cursosArray = [{ id: doc.cursos, ap: 0 }];
          }
          return cursosArray.some(c => (c.id || c) === fCursoId);
        } catch {
          return false;
        }
      });

      // 2. Fetch saved folha from DB
      let endpoint = `/folhas/curso/${fCursoId}?mes=${fMes}&ano=${fAno}`;
      if (fCursoId === 1) {
        endpoint = `/folhas/geral?mes=${fMes}&ano=${fAno}`;
      }
      
      const { data: savedFolha } = await api.get(endpoint);

      if (fCursoId === 1) {
        // Consolidated report, no merging needed
        setDados(savedFolha || []);
        setLastSaved(savedFolha && savedFolha.length > 0 ? new Date() : null);
      } else {
        // Map all course teachers to their default structure
        const defaultMapped = courseDocentes.map(doc => {
          let apValue = 0;
          try {
            let cursosArray = [];
            if (typeof doc.cursos === 'string') {
              const parsed = JSON.parse(doc.cursos);
              cursosArray = Array.isArray(parsed) ? parsed : [parsed];
            } else if (Array.isArray(doc.cursos)) {
              cursosArray = doc.cursos;
            }
            
            // Determine active semester based on the selected reference month:
            // Semester 1: February to June (months 2-6) - mapped as months 1-6
            // Semester 2: July to December (months 7-12)
            const activeSemestre = (fMes >= 7 && fMes <= 12) ? 2 : 1;
            
            let cursoObj = cursosArray.find(c => {
              const cid = c.id !== undefined ? parseInt(c.id) : parseInt(c);
              const csem = c.semestre !== undefined ? parseInt(c.semestre) : null;
              return cid === fCursoId && csem === activeSemestre;
            });
            // Fallback: if no semester-specific match is found, check if a general course config (no semester specified) exists
            if (!cursoObj) {
              cursoObj = cursosArray.find(c => {
                const cid = c.id !== undefined ? parseInt(c.id) : parseInt(c);
                const csem = c.semestre !== undefined ? parseInt(c.semestre) : null;
                return cid === fCursoId && csem === null;
              });
            }

            if (cursoObj && cursoObj.ap !== undefined) {
              apValue = parseFloat(cursoObj.ap) || 0;
            }
          } catch(e) {}

          return {
            docente_nome: doc.nome,
            semanas: Array(5).fill(0).map((_, i) => ({ semana: i + 1, ap: apValue, ad: 0, vp: 0, vd: 0 })),
            total_ap: apValue * 5,
            total_ad: 0,
            total_vp: 0,
            total_vd: 0,
            valor_receber: 0,
            retificada: 0,
            observacoes: null
          };
        });

        // Find saved sheets that are NOT in defaultMapped (historical or unassigned)
        const extraSaved = (savedFolha || []).filter(saved => 
          !defaultMapped.some(def => def.docente_nome.trim().toLowerCase() === saved.docente_nome.trim().toLowerCase())
        ).map(saved => {
          const weeks = saved.semanas || Array(5).fill(0).map((_, i) => ({ semana: i + 1, ap: 0, ad: 0, vp: 0, vd: 0 }));
          return {
            docente_nome: saved.docente_nome,
            total_ap: saved.total_ap || weeks.reduce((acc, s) => acc + (s.ap || 0), 0),
            total_ad: saved.total_ad || weeks.reduce((acc, s) => acc + (s.ad || 0), 0),
            total_vp: saved.total_vp || weeks.reduce((acc, s) => acc + (s.vp || 0), 0),
            total_vd: saved.total_vd || weeks.reduce((acc, s) => acc + (s.vd || 0), 0),
            valor_receber: saved.valor_receber || ((weeks.reduce((acc, s) => acc + (s.ad || 0), 0) + weeks.reduce((acc, s) => acc + (s.vd || 0), 0)) * 500),
            retificada: saved.retificada || 0,
            observacoes: saved.observacoes || null,
            semanas: weeks.map((s, sIdx) => ({
              semana: sIdx + 1,
              ap: s.ap || 0,
              ad: s.ad || 0,
              vp: s.vp || 0,
              vd: s.vd || 0
            }))
          };
        });

        // Merge saved folha with defaultMapped
        const mergedDados = [
          ...defaultMapped.map(def => {
            const saved = savedFolha.find(s => s.docente_nome.trim().toLowerCase() === def.docente_nome.trim().toLowerCase());
            if (saved) {
              const mergedSemanas = def.semanas.map((defSemana, sIdx) => {
                const savedSemana = saved.semanas?.[sIdx];
                return {
                  semana: sIdx + 1,
                  // Load the saved AP if it exists, otherwise use profile's AP
                  ap: savedSemana && savedSemana.ap !== undefined ? parseFloat(savedSemana.ap) : defSemana.ap,
                  ad: savedSemana ? (parseFloat(savedSemana.ad) || 0) : 0,
                  vp: savedSemana ? (parseFloat(savedSemana.vp) || 0) : 0,
                  vd: savedSemana ? (parseFloat(savedSemana.vd) || 0) : 0
                };
              });

              return {
                ...def,
                docente_nome: saved.docente_nome,
                total_ap: mergedSemanas.reduce((acc, s) => acc + s.ap, 0),
                total_ad: mergedSemanas.reduce((acc, s) => acc + s.ad, 0),
                total_vp: mergedSemanas.reduce((acc, s) => acc + s.vp, 0),
                total_vd: mergedSemanas.reduce((acc, s) => acc + s.vd, 0),
                valor_receber: (mergedSemanas.reduce((acc, s) => acc + s.ad, 0) + mergedSemanas.reduce((acc, s) => acc + s.vd, 0)) * 500,
                retificada: saved.retificada,
                observacoes: saved.observacoes,
                semanas: mergedSemanas
              };
            }
            return def;
          }),
          ...extraSaved
        ];

        setDados(mergedDados);
        setLastSaved(savedFolha && savedFolha.length > 0 ? new Date() : null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (type, value) => {
    const val = parseInt(value);
    let newMes = mes, newAno = ano, newCursoId = cursoId;

    if (type === 'mes') { setMes(val); newMes = val; }
    if (type === 'ano') { setAno(val); newAno = val; }
    if (type === 'cursoId') { setCursoId(val); newCursoId = val; }

    fetchFolha(newMes, newAno, newCursoId);
  };

  const calculateTotal = (semanas, field) => {
    return semanas.reduce((acc, s) => acc + (s[field] || 0), 0);
  };

  const calculateTotalFaltasHoras = (semanas) => {
    if (!semanas || !Array.isArray(semanas)) return 0;
    return semanas.reduce((acc, s) => {
      const isExamWeek = (s.vp > 0 || s.vd > 0);
      if (isExamWeek) return acc;
      const ap = parseFloat(s.ap) || 0;
      const ad = parseFloat(s.ad) || 0;
      return acc + Math.max(0, ap - ad);
    }, 0);
  };

  const weekRanges = getWeeksDateRanges(mes, ano);
  const activeDocenteIndex = Math.min(selectedDocenteIndex, Math.max(0, dados.length - 1));
  const selectedDocente = dados[activeDocenteIndex];
  
  const holidaysInMonth = getHolidaysForMonth(mes);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Lançamento de Horas</h1>
          <p className="text-muted-foreground">Introduza manualmente as horas e aulas dadas dos docentes</p>
          
          <div className="flex flex-col sm:flex-row bg-secondary/50 p-1 rounded-xl border select-none w-full sm:w-fit mt-3 gap-1 sm:gap-0">
            <button
              onClick={() => setInputMode('matrix')}
              className={`w-full sm:w-auto px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${inputMode === 'matrix' ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Vista Geral (Tabela)
            </button>
            <button
              onClick={() => setInputMode('individual')}
              className={`w-full sm:w-auto px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${inputMode === 'individual' ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Docente por Docente
            </button>
          </div>
          
          {inputMode === 'individual' && (
            <div className="flex items-center gap-2 mt-3 p-2 bg-amber-50 border border-amber-200 rounded-xl w-fit">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={isExamMode}
                  onChange={(e) => {
                    setIsExamMode(e.target.checked);
                    localStorage.setItem('sgfs_show_vigias', e.target.checked ? 'true' : 'false');
                  }}
                  className="rounded text-amber-600 focus:ring-amber-500 h-4 w-4 cursor-pointer"
                />
                <span className="text-xs font-bold text-amber-800">Modo Exames (Vigias)</span>
              </label>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 w-full md:w-auto mt-4 md:mt-0">
          {isReadOnly && (
            <span className="text-sm font-bold text-destructive mr-2 text-center w-full sm:w-auto">
              ⚠️ Apenas leitura (Mês passado)
            </span>
          )}
          {lastSaved && !isReadOnly && (
            <span className="text-xs text-muted-foreground animate-in fade-in mr-2 text-center w-full sm:w-auto">
              Guardado às {lastSaved.toLocaleTimeString()}
            </span>
          )}
          <button 
            onClick={() => {
              toast((t) => (
                <div className="flex flex-col gap-3">
                  <p className="font-medium text-destructive">Tem certeza que deseja limpar todos os dados actuais?</p>
                  <div className="flex justify-end gap-2 mt-2">
                    <button onClick={() => toast.dismiss(t.id)} className="px-3 py-1.5 text-xs font-bold bg-secondary hover:bg-secondary/80 rounded-lg transition-colors border">Cancelar</button>
                    <button onClick={() => {
                      toast.dismiss(t.id);
                      setDados([]);
                    }} className="px-3 py-1.5 text-xs font-bold bg-destructive hover:bg-destructive/90 text-white rounded-lg transition-colors shadow-sm">Sim, limpar</button>
                  </div>
                </div>
              ), { duration: Infinity, style: { minWidth: '350px' } });
            }}
            disabled={dados.length === 0 || isReadOnly}
            className="bg-destructive/10 hover:bg-destructive/20 text-destructive px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 font-medium disabled:opacity-50 w-full sm:w-auto"
          >
            <Trash2 size={18} />
            Limpar
          </button>

          <button 
            onClick={handleSave}
            disabled={loading || dados.length === 0 || isReadOnly}
            className="bg-primary hover:bg-primary/90 text-white px-6 py-2 rounded-lg transition-all flex items-center justify-center gap-2 font-bold shadow-lg shadow-primary/20 disabled:opacity-50 w-full sm:w-auto"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
            Gravar Dados
          </button>
        </div>
      </div>

      {/* Selectors */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-card p-6 rounded-2xl border shadow-sm">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-muted-foreground">Mês de Referência</label>
          <select 
            value={mes} 
            onChange={(e) => handleFilterChange('mes', e.target.value)}
            className="w-full bg-background border rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-primary/20"
          >
            {meses.map((m, i) => (
              <option key={i} value={i + 1}>{m}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-muted-foreground">Ano</label>
          <input 
            type="number" 
            value={ano} 
            onChange={(e) => handleFilterChange('ano', e.target.value)}
            className="w-full bg-background border rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-muted-foreground">Curso</label>
          <select 
            value={cursoId} 
            onChange={(e) => handleFilterChange('cursoId', e.target.value)}
            disabled={user?.role !== 'ADMIN'}
            className="w-full bg-background border rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-primary/20 disabled:bg-muted"
          >
            {(() => {
              const managedIds = getManagedCourseIds(user);
              if (user?.role === 'ADMIN') {
                return LANCAR_COURSE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ));
              } else {
                return LANCAR_COURSE_OPTIONS.filter(opt => managedIds.includes(opt.value)).map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ));
              }
            })()}
          </select>
        </div>
      </div>
      
      {user?.role !== 'ADMIN' && cursoId !== 1 && (
        hasException ? (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl text-sm font-medium flex items-start gap-2.5 shadow-sm animate-in slide-in-from-top-2 duration-300">
            <span className="text-base text-emerald-600 shrink-0">✅</span>
            <div className="space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <span>Lançamento Autorizado por Exceção Administrativa</span>
                <span className="bg-emerald-200 text-emerald-900 text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider">Ativo</span>
              </p>
              <p className="text-xs text-emerald-700 leading-normal">
                O Administrador Geral abriu uma exceção de prazo para a sua folha de <strong>{meses[mes - 1]} de {ano}</strong>. Você pode lançar e editar as horas deste curso normalmente até o prazo de <strong>{excecaoDetalhe ? new Date(excecaoDetalhe.data_limite).toLocaleString('pt-PT') : ''}</strong>.
              </p>
              {excecaoDetalhe?.motivo && (
                <p className="text-[10px] text-emerald-600 font-bold italic mt-1.5 pl-2 border-l-2 border-emerald-300">
                  Justificativa: {excecaoDetalhe.motivo}
                </p>
              )}
            </div>
          </div>
        ) : isLaunchOpen ? (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl text-sm font-medium flex items-start gap-2 shadow-sm animate-in slide-in-from-top-2 duration-300">
            <span className="text-base">✅</span>
            <div>
              <p className="font-bold">Período de Lançamento Aberto</p>
              <p className="text-xs text-emerald-700 mt-0.5 leading-normal">
                Você pode lançar e editar as horas de <strong>{meses[mes - 1]} de {ano}</strong> até o dia 15 deste mês superior. Após este período, a folha será bloqueada para edições de diretores de curso.
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl text-sm font-medium flex items-start gap-2 shadow-sm animate-in slide-in-from-top-2 duration-300">
            <span className="text-base">⚠️</span>
            <div>
              <p className="font-bold">Período de Lançamento Fechado (Apenas Leitura)</p>
              <p className="text-xs text-rose-700 mt-0.5 leading-normal">
                O preenchimento ou modificação de horas para <strong>{meses[mes - 1]} de {ano}</strong> só é permitido a diretores de curso entre o dia 1 e dia 15 do mês superior (mês seguinte). Somente o administrador geral pode autorizar alterações adicionais.
              </p>
            </div>
          </div>
        )
      )}

      {cursoId === 1 && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl text-sm font-medium flex items-start gap-2 shadow-sm animate-in slide-in-from-top-2 duration-300">
          <span className="text-base">⚠️</span>
          <div>
            <p className="font-bold">Vista Consolidada (Apenas Leitura)</p>
            <p className="text-xs text-amber-700 mt-0.5 leading-normal">
              O lançamento geral consolidado apresenta o somatório de horas de todos os cursos e não permite edições diretas para evitar duplicidade de dados. Para alterar, preencher ou remover horas de um docente, por favor selecione o seu curso específico no menu acima.
            </p>
          </div>
        </div>
      )}

      {holidaysInMonth.length > 0 && (
        <div className="bg-sky-50 border border-sky-200 text-sky-800 p-4 rounded-xl text-sm font-medium flex items-start gap-2 shadow-sm animate-in slide-in-from-top-2 duration-300">
          <span className="text-base">📅</span>
          <div>
            <p className="font-bold">Feriado(s) em {meses[mes - 1]}</p>
            <p className="text-xs text-sky-700 mt-0.5 leading-normal">
              Atenção: Este mês contém os seguintes feriados: 
              <span className="font-bold">{holidaysInMonth.map(h => ` ${h.day} (${h.name})`).join(', ')}</span>. 
              Lembre-se de descontar as Aulas Programadas (AP) se aplicável.
            </p>
          </div>
        </div>
      )}

      {/* Input Mode Conditional Rendering */}
      {inputMode === 'individual' ? (
        <div className="flex flex-col-reverse lg:grid lg:grid-cols-4 gap-6 animate-in fade-in duration-300">
          {/* Left Column: Sidebar of Docentes */}
          <div className="lg:col-span-1 flex flex-col gap-4">
            <button 
              type="button"
              onClick={() => setShowMobileList(!showMobileList)}
              className="lg:hidden w-full flex items-center justify-between bg-card hover:bg-muted/50 border p-3.5 rounded-2xl shadow-sm text-xs font-bold text-slate-700 select-none cursor-pointer transition-colors"
            >
              <span className="flex items-center gap-2">📋 Lista de Docentes ({dados.length})</span>
              <span className="text-primary font-black">{showMobileList ? 'Ocultar ↑' : 'Exibir ↓'}</span>
            </button>

            <div className={`bg-card rounded-2xl border shadow-sm flex flex-col lg:h-[550px] overflow-hidden transition-all duration-300 ${
              showMobileList ? 'flex min-h-[300px] max-h-[450px]' : 'hidden lg:flex'
            }`}>
              <div className="p-4 border-b bg-secondary/10 flex items-center justify-between">
                <h3 className="font-bold text-sm">Docentes ({dados.length})</h3>
                <div className="flex items-center gap-1">
                  <button
                    onClick={addDocente}
                    disabled={isReadOnly}
                    className="text-primary hover:bg-primary/10 p-1.5 rounded-lg transition-colors disabled:opacity-50"
                    title="Adicionar Docente"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto divide-y">
              {dados.map((doc, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedDocenteIndex(idx)}
                  className={`w-full text-left p-3.5 flex flex-col gap-1 transition-all ${
                    idx === activeDocenteIndex 
                      ? 'bg-primary/5 border-l-4 border-primary' 
                      : 'hover:bg-muted/30 border-l-4 border-transparent'
                  }`}
                >
                  <span className="text-xs font-bold truncate block w-full">
                    {doc.docente_nome || `Sem nome (${idx + 1})`}
                  </span>
                  <div className="flex justify-between items-center text-[10px] text-muted-foreground w-full">
                    <span>AP: {calculateTotal(doc.semanas, 'ap')}h</span>
                    <span className="text-primary font-bold">AD: {calculateTotal(doc.semanas, 'ad')}h</span>
                  </div>
                </button>
              ))}
              
              {dados.length === 0 && (
                <div className="p-8 text-center text-xs text-muted-foreground italic">
                  Nenhum docente adicionado.
                </div>
              )}
            </div>
          </div>
        </div>

          {/* Right Column: Focused Edit Form */}
          <div className="lg:col-span-3 bg-card rounded-2xl border shadow-sm p-6 flex flex-col justify-between min-h-[550px]">
            {selectedDocente ? (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b">
                  <div className="flex-1 w-full max-w-md flex items-center gap-2">
                    <div className="w-full">
                      <label className="text-xs font-semibold text-muted-foreground block mb-1">Nome do Docente</label>
                      <input
                        type="text"
                        value={selectedDocente.docente_nome}
                        onChange={(e) => {
                          const n = [...dados];
                          n[activeDocenteIndex].docente_nome = e.target.value;
                          setDados(n);
                        }}
                        disabled={isReadOnly}
                        placeholder="Nome do Docente"
                        className="bg-transparent border-b border-muted hover:border-foreground focus:border-primary text-lg font-bold w-full pb-1 outline-none transition-colors"
                      />
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    {(selectedDocente.retificada === 1 || selectedDocente.retificada === true) && (
                      <span className="text-[10px] text-amber-600 font-extrabold bg-amber-50 px-2 py-1 rounded border border-amber-200">
                        Retificada
                      </span>
                    )}
                    <button
                      onClick={() => handleSaveDocente(activeDocenteIndex)}
                      disabled={loading || isReadOnly}
                      className="flex-1 sm:flex-none justify-center bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg transition-all flex items-center gap-2 text-xs font-bold disabled:opacity-50 shadow-md shadow-primary/20"
                      title="Salvar horas lançadas para este docente"
                    >
                      <Save size={16} />
                      <span>Salvar Horas Lançadas</span>
                    </button>
                    <button
                      onClick={() => handleRemoveDocente(activeDocenteIndex)}
                      disabled={isReadOnly}
                      className="text-destructive hover:bg-destructive/10 p-2 rounded-lg transition-colors disabled:opacity-30"
                      title="Remover Docente"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                {/* 5 Weeks Grid */}
                <div className="flex overflow-x-auto md:grid md:grid-cols-5 gap-4 pb-4">
                  {selectedDocente.semanas.map((s, sIdx) => (
                    <div key={sIdx} className="bg-secondary/20 p-4 rounded-xl border flex flex-col gap-3 relative overflow-hidden min-w-[140px] flex-shrink-0 md:flex-shrink">
                      <div className="absolute top-0 left-0 right-0 h-1 bg-primary/20" />
                      <div className="text-center">
                        <span className="text-xs font-bold text-slate-800">Semana {s.semana}</span>
                        <span className="block text-[9px] text-muted-foreground mt-0.5 min-h-[24px]">
                          {weekRanges[sIdx]}
                        </span>
                      </div>
                      
                      <div className="space-y-2">
                        <div>
                          <label className="text-[10px] font-semibold text-muted-foreground block mb-0.5">AP</label>
                          <input
                            type="number"
                            value={s.ap}
                            onChange={(e) => updateCell(activeDocenteIndex, sIdx, 'ap', e.target.value)}
                            disabled={isReadOnly}
                            className="w-full bg-background border rounded-lg p-2 text-center text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20"
                            placeholder="0"
                            min="0"
                          />
                        </div>
                        <div className="mt-3 p-2.5 bg-primary/10 border-2 border-primary/30 rounded-xl shadow-sm relative transition-all focus-within:border-primary/60 focus-within:bg-primary/15">
                          <label className="text-[11px] font-black text-primary uppercase tracking-wider block mb-1">Aulas Dadas (AD)</label>
                          <input
                            type="number"
                            value={s.ad}
                            onChange={(e) => updateCell(activeDocenteIndex, sIdx, 'ad', e.target.value)}
                            disabled={isReadOnly}
                            className="w-full bg-white border border-primary/20 rounded-lg p-2.5 text-center text-sm font-black text-primary outline-none focus:ring-2 focus:ring-primary shadow-inner"
                            placeholder="0"
                            min="0"
                          />
                        </div>
                        {isExamMode && (
                          <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-muted/50">
                            <div>
                              <label className="text-[9px] font-bold text-muted-foreground block mb-0.5" title="Vigias Programadas">VP</label>
                              <input
                                type="number"
                                value={s.vp}
                                onChange={(e) => updateCell(activeDocenteIndex, sIdx, 'vp', e.target.value)}
                                disabled={isReadOnly}
                                className="w-full bg-background border rounded-lg p-1.5 text-center text-xs font-bold outline-none focus:ring-2 focus:ring-amber-500/50"
                                placeholder="0"
                                min="0"
                              />
                            </div>
                            <div className="bg-amber-50/50 rounded-lg">
                              <label className="text-[9px] font-black text-amber-700 block mb-0.5 px-1" title="Vigias Dadas">VD</label>
                              <input
                                type="number"
                                value={s.vd}
                                onChange={(e) => updateCell(activeDocenteIndex, sIdx, 'vd', e.target.value)}
                                disabled={isReadOnly}
                                className="w-full bg-white border border-amber-200 rounded-lg p-1.5 text-center text-xs font-black text-amber-700 outline-none focus:ring-2 focus:ring-amber-500 shadow-sm"
                                placeholder="0"
                                min="0"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Total box for selected teacher */}
                <div className="bg-secondary/10 border p-4 rounded-xl flex flex-wrap items-center justify-around gap-4 text-center mt-6">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">Total AP</span>
                    <span className="text-lg font-black text-slate-800">{calculateTotal(selectedDocente.semanas, 'ap')}h</span>
                  </div>
                  <div className="w-px h-8 bg-muted" />
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">Total AD</span>
                    <span className="text-lg font-black text-primary">{calculateTotal(selectedDocente.semanas, 'ad')}h</span>
                  </div>
                  {isExamMode && (
                    <>
                      <div className="w-px h-8 bg-muted" />
                      <div>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block">Total VP</span>
                        <span className="text-lg font-black text-slate-800">{calculateTotal(selectedDocente.semanas, 'vp')}h</span>
                      </div>
                      <div className="w-px h-8 bg-muted" />
                      <div>
                        <span className="text-[10px] uppercase font-bold text-amber-700 block">Total VD</span>
                        <span className="text-lg font-black text-amber-600">{calculateTotal(selectedDocente.semanas, 'vd')}h</span>
                      </div>
                    </>
                  )}
                  <div className="w-px h-8 bg-muted" />
                  <div>
                    <span className="text-[10px] uppercase font-bold text-rose-500 block">Previsão Faltas</span>
                    <span className="text-lg font-black text-rose-600">
                      {formatarFaltas(calculateTotalFaltasHoras(selectedDocente.semanas))}
                    </span>
                  </div>
                  <div className="w-px h-8 bg-muted" />
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">Valor a Receber</span>
                    <span className="text-lg font-black text-emerald-600">
                      {((calculateTotal(selectedDocente.semanas, 'ad') + calculateTotal(selectedDocente.semanas, 'vd')) * 500).toLocaleString('pt-MZ')} Mt
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-12 text-muted-foreground">
                <UserPlus size={48} className="text-muted-foreground/50 mb-3" />
                <p className="font-medium text-sm">Nenhum docente seleccionado.</p>
                <p className="text-xs mt-1">Adicione um novo docente ou seleccione-o na barra lateral esquerda.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Matrix Table */
        <div className="bg-card rounded-2xl border shadow-sm overflow-hidden animate-in fade-in duration-300">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="bg-secondary/50 border-b">
                  <th className="p-4 font-bold text-sm w-64">Docente</th>
                  {[1, 2, 3, 4, 5].map((w, idx) => (
                    <th key={w} className="p-4 font-bold text-sm text-center border-l" colSpan={2}>
                      Semana {w}
                      <span className="block text-[10px] text-muted-foreground font-normal mt-0.5">
                        {weekRanges[idx]}
                      </span>
                    </th>
                  ))}
                  <th className="p-4 font-bold text-sm text-center border-l bg-primary/5" colSpan={2}>
                    Total Mensal
                  </th>
                  <th className="p-4 font-bold text-sm text-center border-l bg-rose-50 text-rose-800" rowSpan={2}>
                    Faltas
                  </th>
                  <th className="p-4 w-24 text-center">Ações</th>
                </tr>
                <tr className="bg-secondary/30 border-b text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="p-2">Nome</th>
                  {[1, 2, 3, 4, 5].map(w => (
                    <React.Fragment key={w}>
                      <th className="p-2 text-center border-l">AP</th>
                      <th className="p-2 text-center">AD</th>
                    </React.Fragment>
                  ))}
                  <th className="p-2 text-center border-l bg-primary/5">AP</th>
                  <th className="p-2 text-center bg-primary/5">AD</th>
                  <th className="p-2 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {dados.map((doc, dIdx) => (
                  <tr key={dIdx} className="hover:bg-muted/30 transition-colors">
                    <td className="p-2 flex items-center justify-between min-w-[200px]">
                      <input 
                        type="text" 
                        value={doc.docente_nome} 
                        onChange={(e) => {
                           const n = [...dados];
                           n[dIdx].docente_nome = e.target.value;
                           setDados(n);
                        }}
                        disabled={isReadOnly}
                        placeholder="Nome do Docente"
                        className="bg-transparent border-none focus:ring-0 font-medium disabled:opacity-70 flex-1 outline-none"
                      />
                      {(doc.retificada === 1 || doc.retificada === true) && (
                        <span className="text-[10px] text-amber-600 font-extrabold ml-2 animate-pulse whitespace-nowrap">
                          (Retificada)
                        </span>
                      )}
                    </td>
                    {doc.semanas.map((s, sIdx) => (
                      <React.Fragment key={sIdx}>
                        <td className="p-2 border-l">
                          <input 
                            type="number" 
                            value={s.ap} 
                            onChange={(e) => updateCell(dIdx, sIdx, 'ap', e.target.value)}
                            disabled={isReadOnly}
                            className="w-16 text-center bg-transparent border-none focus:ring-0 disabled:opacity-70"
                          />
                        </td>
                        <td className="p-2">
                          <input 
                            type="number" 
                            value={s.ad} 
                            onChange={(e) => updateCell(dIdx, sIdx, 'ad', e.target.value)}
                            disabled={isReadOnly}
                            className="w-16 text-center bg-transparent border-none focus:ring-0 text-primary font-bold disabled:opacity-70"
                          />
                        </td>
                      </React.Fragment>
                    ))}
                    <td className="p-2 border-l bg-primary/5 text-center font-bold">
                      {calculateTotal(doc.semanas, 'ap')}
                    </td>
                    <td className="p-2 bg-primary/5 text-center font-bold text-primary">
                      {calculateTotal(doc.semanas, 'ad')}
                    </td>
                    <td className="p-2 border-l bg-rose-50/50 text-center font-semibold text-rose-600 text-xs">
                      {formatarFaltas(calculateTotalFaltasHoras(doc.semanas))}
                    </td>
                    <td className="p-2 text-center flex items-center justify-center gap-1">
                      <button 
                        onClick={() => handleSaveDocente(dIdx)}
                        disabled={loading || isReadOnly}
                        className="text-primary hover:bg-primary/10 p-2 rounded-lg transition-colors disabled:opacity-30"
                        title="Gravar este docente"
                      >
                        <Save size={16} />
                      </button>
                      <button 
                        onClick={() => handleRemoveDocente(dIdx)}
                        disabled={isReadOnly}
                        className="text-destructive hover:bg-destructive/10 p-2 rounded-lg transition-colors disabled:opacity-30 disabled:pointer-events-none"
                        title="Remover Docente"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {dados.length === 0 && (
                  <tr>
                    <td colSpan={14} className="p-12 text-center text-muted-foreground italic">
                      Nenhum docente adicionado para este curso. Adicione manualmente ou importe um CSV.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t bg-secondary/10">
            <button 
              onClick={addDocente}
              disabled={isReadOnly}
              className="flex items-center gap-2 text-primary font-bold hover:underline disabled:opacity-50 disabled:pointer-events-none disabled:hover:no-underline"
            >
              <Plus size={20} />
              Adicionar Docente
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LancarNotasPage;
