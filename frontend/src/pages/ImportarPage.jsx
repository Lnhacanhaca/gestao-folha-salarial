import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Loader2, UserPlus } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const ImportarPage = () => {
  const { user } = useAuth();
  const [mes, setMes] = useState(() => parseInt(localStorage.getItem('sgfs_mes')) || new Date().getMonth() + 1);
  const [ano, setAno] = useState(() => parseInt(localStorage.getItem('sgfs_ano')) || new Date().getFullYear());
  const [cursoId, setCursoId] = useState(2);
  const [dados, setDados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);

  useEffect(() => {
    if (user) {
      const activeCursoId = user.role !== 'ADMIN' ? user.curso_id : (parseInt(localStorage.getItem('sgfs_cursoId')) || user.curso_id || 2);
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

  const isReadOnly = (ano < currentYear || (ano === currentYear && mes < currentMonth)) 
    && !canEditPreviousMonth 
    && user?.role !== 'ADMIN';
  
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
      if (dados.length > 0) {
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
      semanas: Array(5).fill(0).map((_, i) => ({ semana: i + 1, ap: 0, ad: 0 }))
    }]);
  };

  const removeDocente = (index) => {
    setDados(dados.filter((_, i) => i !== index));
  };

  const updateCell = (docIndex, weekIndex, field, value) => {
    const val = parseFloat(value) || 0;
    const newDados = [...dados];
    
    if (field === 'ad' && val > newDados[docIndex].semanas[weekIndex].ap) {
      alert('Erro: Aulas Dadas (AD) não podem ser maiores que Programadas (AP)');
      return;
    }

    newDados[docIndex].semanas[weekIndex][field] = val;
    if (canEditPreviousMonth) {
      newDados[docIndex].retificada = true;
      newDados[docIndex].observacoes = "Alterado na retificação (Auditória)";
    }
    setDados(newDados);
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
      alert('Dados salvos com sucesso!');
    } catch (err) {
      alert('Erro ao salvar dados: ' + (err.response?.data?.error?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const fetchFolha = async (fMes, fAno, fCursoId) => {
    try {
      setLoading(true);
      
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
            const cursoObj = cursosArray.find(c => (c.id || c) === fCursoId);
            if (cursoObj && cursoObj.ap !== undefined) {
              apValue = parseFloat(cursoObj.ap) || 0;
            }
          } catch(e) {}

          return {
            docente_nome: doc.nome,
            semanas: Array(5).fill(0).map((_, i) => ({ semana: i + 1, ap: apValue, ad: 0 })),
            retificada: 0,
            observacoes: null
          };
        });

        // Merge saved folha with defaultMapped
        const mergedDados = defaultMapped.map(def => {
          const saved = savedFolha.find(s => s.docente_nome.trim().toLowerCase() === def.docente_nome.trim().toLowerCase());
          if (saved) {
            const mergedSemanas = def.semanas.map((defSemana, sIdx) => {
              const savedSemana = saved.semanas?.[sIdx];
              return {
                semana: sIdx + 1,
                // ALWAYS override with the teacher profile's current AP!
                ap: defSemana.ap,
                ad: savedSemana ? (parseFloat(savedSemana.ad) || 0) : 0
              };
            });

            return {
              ...def,
              docente_nome: saved.docente_nome,
              total_ap: mergedSemanas.reduce((acc, s) => acc + s.ap, 0),
              total_ad: mergedSemanas.reduce((acc, s) => acc + s.ad, 0),
              valor_receber: mergedSemanas.reduce((acc, s) => acc + s.ad, 0) * 500,
              retificada: saved.retificada,
              observacoes: saved.observacoes,
              semanas: mergedSemanas
            };
          }
          return def;
        });

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Lançamento de Horas</h1>
          <p className="text-muted-foreground">Introduza manualmente as horas e aulas dadas dos docentes</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {isReadOnly && (
            <span className="text-sm font-bold text-destructive mr-2">
              ⚠️ Apenas leitura (Mês passado)
            </span>
          )}
          {lastSaved && !isReadOnly && (
            <span className="text-xs text-muted-foreground animate-in fade-in mr-2">
              Guardado às {lastSaved.toLocaleTimeString()}
            </span>
          )}
          <button 
            onClick={() => {
              if(window.confirm('Tem certeza que deseja limpar todos os dados actuais?')) {
                setDados([]);
              }
            }}
            disabled={dados.length === 0 || isReadOnly}
            className="bg-destructive/10 hover:bg-destructive/20 text-destructive px-4 py-2 rounded-lg transition-colors flex items-center gap-2 font-medium disabled:opacity-50"
          >
            <Trash2 size={18} />
            Limpar
          </button>

          <button 
            onClick={handleSave}
            disabled={loading || dados.length === 0 || isReadOnly}
            className="bg-primary hover:bg-primary/90 text-white px-6 py-2 rounded-lg transition-all flex items-center gap-2 font-bold shadow-lg shadow-primary/20 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
            Gravar Folha
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
            <option value={1}>Geral (Consolidado)</option>
            <option value={2}>Contabilidade e Auditoria e Contabilidade e Administração Pública</option>
            <option value={3}>Engenharia de Minas e Engenharia de Processamento Mineral</option>
            <option value={4}>Engenharia Informática</option>
          </select>
        </div>
      </div>

      {/* Matrix Table */}
      <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-secondary/50 border-b">
                <th className="p-4 font-bold text-sm w-64">Docente</th>
                {[1, 2, 3, 4, 5].map(w => (
                  <th key={w} className="p-4 font-bold text-sm text-center border-l" colSpan={2}>
                    Semana {w}
                  </th>
                ))}
                <th className="p-4 font-bold text-sm text-center border-l bg-primary/5" colSpan={2}>
                  Total Mensal
                </th>
                <th className="p-4 w-16"></th>
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
                <th></th>
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
                  <td className="p-2 text-center">
                    <button 
                      onClick={() => removeDocente(dIdx)}
                      disabled={isReadOnly}
                      className="text-destructive hover:bg-destructive/10 p-2 rounded-lg transition-colors disabled:opacity-30 disabled:pointer-events-none"
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
    </div>
  );
};

export default ImportarPage;
