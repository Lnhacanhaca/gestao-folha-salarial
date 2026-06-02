import React, { useState, useEffect } from 'react';
import { Printer, FileText, Loader2 } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { numeroPorExtenso } from '../lib/extenso';
import { dbCursoIdToReportId, REPORT_COURSE_OPTIONS, getManagedCourseIds, reportIdToDbCursoIds } from '../lib/cursos';

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

// Formats number to pt-MZ style: "38.000,00 Mt"
const formatarValor = (valor) => {
  if (valor === undefined || valor === null) return "0,00 Mt";
  const num = parseFloat(valor).toFixed(2);
  const [inteiro, decimal] = num.split('.');
  const inteiroFormatado = inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${inteiroFormatado},${decimal} Mt`;
};

const formatarFaltas = (horasFalta) => {
  if (horasFalta <= 0) return "-";
  const numFaltas = horasFalta / 2;
  const faltasStr = Number.isInteger(numFaltas) ? numFaltas.toString() : numFaltas.toFixed(1);
  return `${horasFalta}h (${faltasStr} ${numFaltas === 1 ? 'falta' : 'faltas'})`;
};

const RelatoriosPage = () => {
  const { user } = useAuth();
  const [mes, setMes] = useState(() => {
    const now = new Date();
    let m = now.getMonth() + 1;
    if (now.getDate() <= 15) {
      m = m - 1;
      if (m === 0) m = 12;
    }
    return m;
  });
  const [ano, setAno] = useState(() => {
    const now = new Date();
    let m = now.getMonth() + 1;
    let y = now.getFullYear();
    if (now.getDate() <= 15) {
      m = m - 1;
      if (m === 0) y = y - 1;
    }
    return y;
  });
  const [cursoId, setCursoId] = useState(() => {
    if (user && user.role !== 'ADMIN') return dbCursoIdToReportId(user);
    return 1;
  });
  const [dados, setDados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('folha'); // 'folha', 'oficio' or 'falha'
  const [showVigias, setShowVigias] = useState(() => localStorage.getItem('sgfs_show_vigias') === 'true');



  const [falhaModalOpen, setFalhaModalOpen] = useState(false);
  const [falhaDocenteIdx, setFalhaDocenteIdx] = useState('');
  const [falhaJustificacao, setFalhaJustificacao] = useState('O docente submeteu a folha de presenças fora do prazo estabelecido. Solicita-se a aprovação e o respectivo pagamento das horas listadas abaixo.');

  const getIsExamWeek = (wIdx) => {
    if (!showVigias) return false;
    return dados.some(row => {
      const s = row.semanas?.[wIdx];
      return (s?.vp > 0 || s?.vd > 0);
    });
  };

  const getWeekProgramadas = (row, wIdx) => {
    const s = row.semanas?.[wIdx];
    return getIsExamWeek(wIdx) ? (s?.vp || 0) : (s?.ap || 0);
  };

  const getWeekDadas = (row, wIdx) => {
    const s = row.semanas?.[wIdx];
    return getIsExamWeek(wIdx) ? (s?.vd || 0) : (s?.ad || 0);
  };

  const getDocenteTotalProgramadas = (row) => {
    let tot = 0;
    for (let i = 0; i < 5; i++) {
      tot += getWeekProgramadas(row, i);
    }
    return tot;
  };

  const getDocenteTotalDadas = (row) => {
    let tot = 0;
    for (let i = 0; i < 5; i++) {
      tot += getWeekDadas(row, i);
    }
    return tot;
  };

  const getDocenteTotalFaltasHoras = (row) => {
    let tot = 0;
    for (let i = 0; i < 5; i++) {
      if (!getIsExamWeek(i)) {
        const s = row.semanas?.[i];
        const ap = s?.ap || 0;
        const ad = s?.ad || 0;
        tot += Math.max(0, ap - ad);
      }
    }
    return tot;
  };

  const totalGeralDadas = dados.reduce((acc, r) => acc + getDocenteTotalDadas(r), 0);
  const valorTotalMts = totalGeralDadas * 500;
  const valorExtenso = numeroPorExtenso(valorTotalMts);

  const meses = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const fetchData = async () => {
    setLoading(true);
    try {
      let endpoint = `/folhas/curso/${cursoId}?mes=${mes}&ano=${ano}&combined=true`;
      if (cursoId === 1) {
        endpoint = `/folhas/geral?mes=${mes}&ano=${ano}`;
      }
      const { data } = await api.get(endpoint);
      
      const getIsExamWeekFresh = (wIdx) => {
        if (!showVigias) return false;
        return data.some(row => {
          const s = row.semanas?.[wIdx];
          return (s?.vp > 0 || s?.vd > 0);
        });
      };
      
      const getDocenteTotalDadasFresh = (row) => {
        let tot = 0;
        for (let i = 0; i < 5; i++) {
          const s = row.semanas?.[i];
          const isExam = getIsExamWeekFresh(i);
          tot += isExam ? (s?.vd || 0) : (s?.ad || 0);
        }
        return tot;
      };
      
      const filtered = data.filter(row => getDocenteTotalDadasFresh(row) > 0);
      setDados(filtered);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [mes, ano, cursoId]);

  useEffect(() => {
    if (user && user.role !== 'ADMIN') {
      setCursoId(dbCursoIdToReportId(user));
    }
  }, [user]);

  useEffect(() => {
    if (cursoId !== 1) setViewMode('folha');
  }, [cursoId]);

  const weekRanges = getWeeksDateRanges(mes, ano);

  return (
    <div className="space-y-6">
      <style>
        {`
          @media print {
            @page {
              size: ${(viewMode === 'oficio' || viewMode === 'falha') ? 'A4 portrait' : 'A4 landscape'};
              margin: 0;
            }
            /* Reset layout elements for print to avoid flexbox pagination/clipping bugs */
            html, 
            body, 
            #root,
            div.min-h-screen,
            div.flex.flex-1,
            div.flex-1.flex.flex-col {
              display: block !important;
              height: auto !important;
              min-height: 0 !important;
              overflow: visible !important;
              position: static !important;
              background: white !important;
              background-color: white !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            /* Reset main page container to avoid margins/shadows/clipping */
            main {
              display: block !important;
              height: auto !important;
              min-height: 0 !important;
              overflow: visible !important;
              position: static !important;
              background: white !important;
              background-color: white !important;
              margin: 0 !important;
              padding: 0 !important;
              max-width: none !important;
              width: 100% !important;
            }
            body {
              padding: ${viewMode === 'oficio' ? '2.0cm 2.0cm 2.5cm 2.5cm' : '1.2cm 1.0cm 2.4cm 1.0cm'} !important;
              margin: 0 !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .no-print {
              display: none !important;
            }
            .print-no-break {
              page-break-inside: avoid;
              break-inside: avoid;
            }
            div {
              overflow: visible !important;
            }
            table {
              width: 100% !important;
              border-collapse: collapse !important;
              page-break-inside: auto;
            }
            tr {
              page-break-inside: avoid;
              page-break-after: auto;
            }
            thead th {
              background-color: #f3f4f6 !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          }
        `}
      </style>

      {/* Header - No Print */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <h1 className="text-3xl font-bold">Relatórios e Folhas</h1>
          <p className="text-muted-foreground">Visualize e imprima as folhas de pagamento mensais</p>
        </div>

        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 w-full md:w-auto mt-4 md:mt-0">
          {cursoId === 1 && (
            <button 
              onClick={() => {
                setViewMode('oficio');
                const originalTitle = document.title;
                document.title = `Ofício mês ${meses[mes-1]}`;
                setTimeout(() => {
                  window.print();
                  setTimeout(() => {
                    document.title = originalTitle;
                  }, 1000);
                }, 150);
              }}
              className="bg-secondary hover:bg-secondary/90 text-foreground px-5 py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 font-bold shadow-sm w-full sm:w-auto"
            >
              <FileText size={18} />
              Imprimir Ofício
            </button>
          )}
          <button 
            onClick={() => {
              setViewMode('folha');
              const originalTitle = document.title;
              document.title = `Folha mês ${meses[mes-1]}`;
              setTimeout(() => {
                window.print();
                setTimeout(() => {
                  document.title = originalTitle;
                }, 1000);
              }, 150);
            }}
            className="bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 font-bold shadow-lg shadow-primary/20 w-full sm:w-auto"
          >
            <Printer size={18} />
            Imprimir Folha
          </button>
          {cursoId !== 1 && dados.length > 0 && (
            <button 
              onClick={() => {
                setFalhaDocenteIdx(0);
                setFalhaModalOpen(true);
              }}
              className="bg-amber-100 hover:bg-amber-200 text-amber-800 px-5 py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 font-bold shadow-sm w-full sm:w-auto border border-amber-300"
            >
              <FileText size={18} />
              Justificação Individual (Atraso)
            </button>
          )}
        </div>
      </div>

      {/* Selectors - No Print */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 bg-card p-6 rounded-2xl border shadow-sm no-print items-end">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-muted-foreground">Mês</label>
          <select 
            value={mes} 
            onChange={(e) => setMes(parseInt(e.target.value))}
            className="w-full bg-background border rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-primary/20 font-medium"
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
            onChange={(e) => setAno(parseInt(e.target.value))}
            className="w-full bg-background border rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-primary/20 font-medium"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-muted-foreground">Curso</label>
          <select 
            value={cursoId} 
            onChange={(e) => setCursoId(parseInt(e.target.value))}
            disabled={user?.role !== 'ADMIN'}
            className="w-full bg-background border rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-primary/20 disabled:bg-muted font-medium"
          >
            {(() => {
              if (user?.role === 'ADMIN') {
                return REPORT_COURSE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ));
              } else {
                const userReportId = dbCursoIdToReportId(user?.curso_id);
                return REPORT_COURSE_OPTIONS.filter(opt => opt.value === userReportId).map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ));
              }
            })()}
          </select>
        </div>
        <div className="space-y-2">
          <label className="flex items-center gap-2 bg-background border rounded-xl p-2.5 h-[46px] cursor-pointer select-none">
            <input 
              type="checkbox" 
              checked={showVigias}
              onChange={(e) => {
                setShowVigias(e.target.checked);
                localStorage.setItem('sgfs_show_vigias', e.target.checked ? 'true' : 'false');
              }}
              className="rounded text-amber-600 focus:ring-amber-500 h-4 w-4 cursor-pointer"
            />
            <span className="text-xs font-bold text-amber-800">Exibir Vigias (Modo Exames)</span>
          </label>
        </div>
      </div>

      {/* Ofício - Print Ready (Only for Geral) */}
      {cursoId === 1 && !loading && viewMode === 'oficio' && (
        <div className="bg-white text-black p-4 sm:p-8 border sm:border-gray-200 sm:shadow-lg rounded-2xl min-h-[800px] print:p-0 print:border-0 print:shadow-none w-full max-w-[850px] mx-auto print:max-w-none overflow-x-auto">
          <div className="min-w-[800px] print:min-w-0">
            <div className="text-center mb-6" style={{ fontSize: '12pt' }}>
              <img src="/emblema.png" alt="República de Moçambique" className="h-20 mx-auto mb-2 object-contain" />
              <h2 className="font-bold uppercase tracking-wider" style={{ fontSize: '12pt' }}>República de Moçambique</h2>
              <div className="my-4">
                <h2 className="font-bold uppercase tracking-wide" style={{ fontSize: '12pt' }}>Instituto Superior Politécnico de Tete</h2>
                <h3 className="font-bold uppercase" style={{ fontSize: '12pt' }}>(ISPT)</h3>
              </div>
            </div>

            <div className="mt-8 space-y-6 px-4 sm:px-8 max-w-4xl mx-auto text-justify" style={{ fontSize: '12pt' }}>
              <p className="font-bold">
                Para: Director Geral Adjunto para Área de Administração e Finanças
              </p>

              <p className="mt-2">
                <span className="font-bold">Assunto:</span> <span className="underline">Pagamento de Salário referente ao mês de {meses[mes-1]} de {ano}</span>
              </p>

              <div className="space-y-4 leading-relaxed mt-4">
                <p>
                  1. Em anexo, se envia o mapa referente a aulas programadas e dadas pelos docentes e os respectivos valores a serem remunerados.
                </p>
                <p>
                  2. É de referir que o valor total a ser remunerado aos docentes é de <span className="font-bold">{formatarValor(valorTotalMts)}</span> ({valorExtenso}).
                </p>
                <p>
                  3. À consideração Superior.
                </p>
              </div>

              {/* Signatures block moved right after point 3 */}
              <div className="mt-6 text-center space-y-6 w-full print-no-break" style={{ fontSize: '12pt' }}>
                <p>Tete, {new Date().getDate()} de {meses[new Date().getMonth()]} de {new Date().getFullYear()}</p>
                <p className="font-bold uppercase tracking-wider" style={{ fontSize: '12pt' }}>Os Directores de Curso</p>

                <div className="flex flex-col sm:flex-row justify-around items-center gap-8 mt-6 w-full">
                  <div className="space-y-2">
                    <div className="border-b border-black w-52 mx-auto"></div>
                    <p className="font-semibold" style={{ fontSize: '12pt' }}>/MSc. Lucas Jordão Simoco/</p>
                  </div>
                  <div className="space-y-2">
                    <div className="border-b border-black w-52 mx-auto"></div>
                    <p className="font-semibold" style={{ fontSize: '12pt' }}>/MSc. Almeida Albuquerque/</p>
                  </div>
                  <div className="space-y-2">
                    <div className="border-b border-black w-52 mx-auto"></div>
                    <p className="font-semibold" style={{ fontSize: '12pt' }}>/MSc. Luís Jorge Nhacanhaca/</p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Report Sheet - Print Ready */}
      {viewMode === 'folha' && (
        <div className="bg-white text-black p-4 sm:p-8 border sm:border-gray-200 sm:shadow-lg rounded-2xl min-h-[1000px] print:p-0 print:border-0 print:shadow-none w-full max-w-[1100px] mx-auto print:max-w-none">
          <div className="text-center mb-6">
            <div className="flex justify-center mb-2">
              <img src="/logo.png" alt="Instituto Superior Politécnico de Tete" className="h-16 object-contain" />
            </div>
            <h3 className="text-sm sm:text-base font-bold uppercase mt-2 leading-snug">
              {cursoId === 1 ? 'Direcção do Curso Nocturno' : 
               cursoId === 2 ? 'Direcção do Curso Contabilidade e Auditoria e Contabilidade e Administração Pública Pós-laboral' :
               cursoId === 3 ? 'Direcção do Curso Engenharia de Minas e Engenharia de Processamento Mineral Pós-laboral' :
               cursoId === 4 ? 'Direcção do Curso Engenharia Informática Pós-laboral' : ''}
            </h3>
            <p className="mt-4 font-bold text-xs sm:text-sm">
              Relação das Aulas Dadas por Docentes no Curso Nocturno - Mês de {meses[mes-1]} / {ano}
            </p>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center p-20 gap-4">
              <Loader2 className="animate-spin text-primary" size={40} />
              <p className="text-muted-foreground font-semibold">Processando dados...</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto w-full scrollbar-thin print:border-none print:overflow-visible print:w-full">
                <table className="w-full border-collapse text-[10px] text-center min-w-[950px] print:min-w-0">
                  <thead>
                    <tr className="bg-gray-200 border-2 border-black">
                      <th rowSpan={3} className="p-1.5 border-2 border-black w-8">Nº</th>
                      <th rowSpan={3} className="p-1.5 border-2 border-black w-44 text-left">Docentes</th>
                      <th colSpan={10} className="p-1.5 border-2 border-black">Aulas / Vigias Mensais</th>
                      <th colSpan={2} rowSpan={2} className="p-1.5 border-2 border-black">Totais</th>
                      <th colSpan={1} rowSpan={3} className="p-1.5 border-2 border-black w-24">Total Programado (Mt)</th>
                      <th colSpan={1} rowSpan={3} className="p-1.5 border-2 border-black w-24">Total a Receber (Mt)</th>
                    </tr>
                    <tr className="bg-gray-200 border-2 border-black">
                      <th colSpan={2} className="p-1 border-2 border-black text-[9px]">
                        1ª Semana
                        <span className="block text-[8px] font-normal text-gray-500 print:text-black">({weekRanges[0]})</span>
                      </th>
                      <th colSpan={2} className="p-1 border-2 border-black text-[9px]">
                        2ª Semana
                        <span className="block text-[8px] font-normal text-gray-500 print:text-black">({weekRanges[1]})</span>
                      </th>
                      <th colSpan={2} className="p-1 border-2 border-black text-[9px]">
                        3ª Semana
                        <span className="block text-[8px] font-normal text-gray-500 print:text-black">({weekRanges[2]})</span>
                      </th>
                      <th colSpan={2} className="p-1 border-2 border-black text-[9px]">
                        4ª Semana
                        <span className="block text-[8px] font-normal text-gray-500 print:text-black">({weekRanges[3]})</span>
                      </th>
                      <th colSpan={2} className="p-1 border-2 border-black text-[9px]">
                        5ª Semana
                        <span className="block text-[8px] font-normal text-gray-500 print:text-black">({weekRanges[4]})</span>
                      </th>
                    </tr>
                    <tr className="bg-gray-200 border-2 border-black text-[9px]">
                      <th className="p-1 border-2 border-black w-8">{getIsExamWeek(0) ? 'VP' : 'AP'}</th>
                      <th className="p-1 border-2 border-black w-8">{getIsExamWeek(0) ? 'VD' : 'AD'}</th>
                      <th className="p-1 border-2 border-black w-8">{getIsExamWeek(1) ? 'VP' : 'AP'}</th>
                      <th className="p-1 border-2 border-black w-8">{getIsExamWeek(1) ? 'VD' : 'AD'}</th>
                      <th className="p-1 border-2 border-black w-8">{getIsExamWeek(2) ? 'VP' : 'AP'}</th>
                      <th className="p-1 border-2 border-black w-8">{getIsExamWeek(2) ? 'VD' : 'AD'}</th>
                      <th className="p-1 border-2 border-black w-8">{getIsExamWeek(3) ? 'VP' : 'AP'}</th>
                      <th className="p-1 border-2 border-black w-8">{getIsExamWeek(3) ? 'VD' : 'AD'}</th>
                      <th className="p-1 border-2 border-black w-8">{getIsExamWeek(4) ? 'VP' : 'AP'}</th>
                      <th className="p-1 border-2 border-black w-8">{getIsExamWeek(4) ? 'VD' : 'AD'}</th>
                      <th className="p-1 border-2 border-black w-8">AP/VP</th>
                      <th className="p-1 border-2 border-black w-8">AD/VD</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dados.map((row, idx) => {
                      return (
                        <tr key={idx} className="border-2 border-black hover:bg-gray-50">
                          <td className="p-1.5 border-2 border-black">{idx + 1}</td>
                          <td className="p-1.5 border-2 border-black text-left font-medium w-44">
                            {row.docente_nome}
                            {(row.retificada === 1 || row.retificada === true) && (
                              <span className="text-[8px] text-amber-600 font-extrabold ml-1 print:text-black">
                                (Retificada)
                              </span>
                            )}
                          </td>
                          
                          <td className="p-1.5 border-2 border-black">{getWeekProgramadas(row, 0)}</td>
                          <td className="p-1.5 border-2 border-black">{getWeekDadas(row, 0)}</td>
                          <td className="p-1.5 border-2 border-black">{getWeekProgramadas(row, 1)}</td>
                          <td className="p-1.5 border-2 border-black">{getWeekDadas(row, 1)}</td>
                          <td className="p-1.5 border-2 border-black">{getWeekProgramadas(row, 2)}</td>
                          <td className="p-1.5 border-2 border-black">{getWeekDadas(row, 2)}</td>
                          <td className="p-1.5 border-2 border-black">{getWeekProgramadas(row, 3)}</td>
                          <td className="p-1.5 border-2 border-black">{getWeekDadas(row, 3)}</td>
                          <td className="p-1.5 border-2 border-black">{getWeekProgramadas(row, 4)}</td>
                          <td className="p-1.5 border-2 border-black">{getWeekDadas(row, 4)}</td>

                           <td className="p-1.5 border-2 border-black font-semibold">{getDocenteTotalProgramadas(row)}</td>
                          <td className="p-1.5 border-2 border-black font-extrabold">{getDocenteTotalDadas(row)}</td>
                          
                          <td className="p-1.5 border-2 border-black font-medium">
                            {formatarValor(getDocenteTotalProgramadas(row) * 500)}
                          </td>
                          <td className="p-1.5 border-2 border-black font-extrabold">
                            {formatarValor(getDocenteTotalDadas(row) * 500)}
                          </td>
                        </tr>
                      );
                    })}
                    {/* Total Row */}
                    <tr className="border-2 border-black bg-gray-200 font-bold">
                      <td colSpan={2} className="p-1.5 text-center">Total Geral</td>
                      
                      <td className="p-1.5 border-2 border-black">
                        {dados.reduce((acc, row) => acc + getWeekProgramadas(row, 0), 0)}
                      </td>
                      <td className="p-1.5 border-2 border-black">
                        {dados.reduce((acc, row) => acc + getWeekDadas(row, 0), 0)}
                      </td>
                      <td className="p-1.5 border-2 border-black">
                        {dados.reduce((acc, row) => acc + getWeekProgramadas(row, 1), 0)}
                      </td>
                      <td className="p-1.5 border-2 border-black">
                        {dados.reduce((acc, row) => acc + getWeekDadas(row, 1), 0)}
                      </td>
                      <td className="p-1.5 border-2 border-black">
                        {dados.reduce((acc, row) => acc + getWeekProgramadas(row, 2), 0)}
                      </td>
                      <td className="p-1.5 border-2 border-black">
                        {dados.reduce((acc, row) => acc + getWeekDadas(row, 2), 0)}
                      </td>
                      <td className="p-1.5 border-2 border-black">
                        {dados.reduce((acc, row) => acc + getWeekProgramadas(row, 3), 0)}
                      </td>
                      <td className="p-1.5 border-2 border-black">
                        {dados.reduce((acc, row) => acc + getWeekDadas(row, 3), 0)}
                      </td>
                      <td className="p-1.5 border-2 border-black">
                        {dados.reduce((acc, row) => acc + getWeekProgramadas(row, 4), 0)}
                      </td>
                      <td className="p-1.5 border-2 border-black">
                        {dados.reduce((acc, row) => acc + getWeekDadas(row, 4), 0)}
                      </td>

                       <td className="p-1.5 border-2 border-black">{dados.reduce((acc, row) => acc + getDocenteTotalProgramadas(row), 0)}</td>
                      <td className="p-1.5 border-2 border-black">{dados.reduce((acc, row) => acc + getDocenteTotalDadas(row), 0)}</td>
                      
                      <td className="p-1.5 border-2 border-black text-[11px] font-bold text-black">
                        {formatarValor(dados.reduce((acc, row) => acc + getDocenteTotalProgramadas(row), 0) * 500)}
                      </td>
                      <td className="p-1.5 border-2 border-black bg-yellow-100 text-[11px] font-black text-black">
                        {formatarValor(totalGeralDadas * 500)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex flex-col sm:flex-row justify-between items-start gap-4 w-full">
                <div className="text-[10px] text-black font-bold text-left pt-2">
                  <p>NB: AP - Aulas Programadas; AD - Aulas Dadas;</p>
                  {showVigias && <p>VP - Vigias Programadas; VD - Vigias Dadas;</p>}
                </div>
                {cursoId === 1 && (
                  <div className="border-2 border-black p-2 bg-gray-50 text-right min-w-[280px] self-end sm:self-start">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-black block">Total Geral do Mês:</span>
                    <span className="text-sm font-black text-black block mt-0.5">
                      {formatarValor(valorTotalMts)}
                    </span>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Dynamic Signatures Footer */}
          <div className="mt-16 flex flex-col sm:flex-row justify-around items-end gap-10 print-no-break w-full">
            {cursoId === 1 ? (
               // Consolidade View - 3 Director Signatures
               <>
                 <div className="text-center space-y-6 flex-1 max-w-[200px]">
                   <p className="text-[9px] font-bold uppercase tracking-wider leading-tight">O Coordenador de Curso (CA/CAP)</p>
                   <div className="h-10 flex items-end justify-center">
                     <div className="border-b border-black w-40"></div>
                   </div>
                   <p className="text-[10px] font-semibold">MSc. Almeida Albuquerque</p>
                 </div>
                 <div className="text-center space-y-6 flex-1 max-w-[200px]">
                   <p className="text-[9px] font-bold uppercase tracking-wider leading-tight">O Coordenador de Curso (EM/EPM)</p>
                   <div className="h-10 flex items-end justify-center">
                     <div className="border-b border-black w-40"></div>
                   </div>
                   <p className="text-[10px] font-semibold">MSc. Lucas Simoco</p>
                 </div>
                 <div className="text-center space-y-6 flex-1 max-w-[200px]">
                   <p className="text-[9px] font-bold uppercase tracking-wider leading-tight">O Coordenador de Curso (EI)</p>
                   <div className="h-10 flex items-end justify-center">
                     <div className="border-b border-black w-40"></div>
                   </div>
                   <p className="text-[10px] font-semibold">MSc. Luís Jorge Nhacanhaca</p>
                 </div>
               </>
            ) : (
               // Single Course View - Beautifully Centered
               <div className="text-center space-y-6 max-w-lg mx-auto flex-1">
                 <p className="text-[9px] sm:text-xs font-bold uppercase tracking-wider leading-snug">
                   {cursoId === 2 ? 'O Director do Curso Contabilidade e Auditoria e Contabilidade e Administração Pública Pós-laboral' :
                    cursoId === 3 ? 'O Director do Curso Engenharia de Minas e Engenharia de Processamento Mineral Pós-laboral' :
                    cursoId === 4 ? 'O Director do Curso Engenharia Informática Pós-laboral' : ''}
                 </p>
                 <div className="h-12 flex items-end justify-center">
                   <div className="border-b border-black w-60"></div>
                 </div>
                 <p className="text-[10px] sm:text-xs font-semibold">
                   {cursoId === 2 ? 'MSc. Almeida Ismael de Albuquerque' : 
                    cursoId === 3 ? 'MSc. Lucas Jordão Simoco' : 
                    cursoId === 4 ? 'MSc. Luís Jorge Nhacanhaca' : ''}
                 </p>
               </div>
            )}
          </div>

          <div className="mt-12 text-center text-[10px] text-gray-400 no-print">
            Este documento foi gerado electronicamente pelo SGFS em {new Date().toLocaleDateString('pt-PT')}
          </div>
        </div>
      )}

      {/* Falha Modal */}
      {falhaModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 no-print">
          <div className="bg-card w-full max-w-lg rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95">
            <div className="p-4 border-b bg-secondary/30">
              <h3 className="font-bold text-lg">Gerar Justificação Individual</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Documento especial para envio às finanças justicando lançamento fora do prazo.
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-muted-foreground">Selecionar Docente</label>
                <select 
                  value={falhaDocenteIdx}
                  onChange={(e) => setFalhaDocenteIdx(parseInt(e.target.value))}
                  className="w-full bg-background border rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-amber-500/20"
                >
                  {dados.map((d, i) => (
                    <option key={i} value={i}>{d.docente_nome} (Valor: {formatarValor(((d.total_ad || 0) + (d.total_vd || 0)) * 500)})</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-muted-foreground">Justificação da Falha / Atraso</label>
                <textarea 
                  value={falhaJustificacao}
                  onChange={(e) => setFalhaJustificacao(e.target.value)}
                  className="w-full bg-background border rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-amber-500/20 min-h-[100px] text-sm"
                  placeholder="Escreva a justificação aqui..."
                />
              </div>
            </div>
            <div className="p-4 border-t bg-secondary/10 flex justify-end gap-2">
              <button 
                onClick={() => setFalhaModalOpen(false)}
                className="px-4 py-2 text-sm font-bold bg-secondary hover:bg-secondary/80 rounded-xl transition-colors border"
              >
                Cancelar
              </button>
              <button 
                onClick={() => {
                  setFalhaModalOpen(false);
                  setViewMode('falha');
                  const originalTitle = document.title;
                  document.title = `Justificacao_${dados[falhaDocenteIdx]?.docente_nome}_Mes_${meses[mes-1]}`;
                  setTimeout(() => {
                    window.print();
                    setTimeout(() => {
                      document.title = originalTitle;
                      setViewMode('folha');
                    }, 1000);
                  }, 150);
                }}
                className="px-4 py-2 text-sm font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl transition-colors shadow-sm flex items-center gap-2"
              >
                <Printer size={16} />
                Confirmar e Imprimir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Falha Print Template */}
      {viewMode === 'falha' && dados[falhaDocenteIdx] && (
        <div className="bg-white text-black p-4 sm:p-8 border sm:border-gray-200 sm:shadow-lg rounded-2xl min-h-[1000px] flex flex-col print:p-0 print:border-0 print:shadow-none w-full max-w-[850px] mx-auto print:max-w-none relative text-xs sm:text-sm" style={{ fontSize: '12pt' }}>
          <div className="text-center mb-8">
            <img src="/emblema.png" alt="República de Moçambique" className="h-24 mx-auto mb-2 object-contain" />
            <h2 className="font-bold uppercase text-sm tracking-wider">República de Moçambique</h2>
            <div className="my-6">
              <h2 className="text-base font-bold uppercase tracking-wide">Instituto Superior Politécnico de Tete</h2>
              <h3 className="font-bold uppercase text-sm">(ISPT)</h3>
            </div>
            <h3 className="text-sm font-bold uppercase mt-6 leading-snug">
              {cursoId === 2 ? 'Direcção do Curso Contabilidade e Auditoria e Contabilidade e Administração Pública Pós-laboral' :
               cursoId === 3 ? 'Direcção do Curso Engenharia de Minas e Engenharia de Processamento Mineral Pós-laboral' :
               cursoId === 4 ? 'Direcção do Curso Engenharia Informática Pós-laboral' : 'Direcção de Curso'}
            </h3>
          </div>

          <div className="mt-8 space-y-8 px-4 sm:px-8 max-w-4xl mx-auto text-justify text-sm w-full">
            <div className="border border-black p-4 bg-gray-50 mb-8">
              <h4 className="font-bold uppercase text-center mb-4 underline">Nota de Justificação de Lançamento de Horas</h4>
              <p className="mb-2"><span className="font-bold">Docente:</span> {dados[falhaDocenteIdx].docente_nome}</p>
              <p className="mb-2"><span className="font-bold">Referência:</span> Mês de {meses[mes-1]} de {ano}</p>
              <p className="mb-2"><span className="font-bold">Justificação:</span> {falhaJustificacao}</p>
            </div>

            <p className="mb-4 font-bold">Resumo das Horas Lançadas e Valor a Pagar:</p>
            
            <div className="overflow-x-auto w-full scrollbar-thin print:border-none print:overflow-visible print:w-full border-2 border-black">
              <table className="w-full border-collapse text-[9px] text-center print:min-w-0">
                <thead>
                  <tr className="bg-gray-200 border-2 border-black">
                    <th rowSpan={3} className="p-1.5 border-2 border-black w-8">Nº</th>
                    <th rowSpan={3} className="p-1.5 border-2 border-black w-44 text-left">Docentes</th>
                    <th colSpan={10} className="p-1.5 border-2 border-black">Aulas / Vigias Mensais</th>
                    <th colSpan={2} rowSpan={2} className="p-1.5 border-2 border-black">Totais</th>
                    <th colSpan={1} rowSpan={3} className="p-1.5 border-2 border-black w-24">Total Programado (Mt)</th>
                    <th colSpan={1} rowSpan={3} className="p-1.5 border-2 border-black w-24">Total a Receber (Mt)</th>
                  </tr>
                  <tr className="bg-gray-200 border-2 border-black">
                    <th colSpan={2} className="p-1 border-2 border-black text-[9px]">
                      1ª Semana
                      <span className="block text-[8px] font-normal text-gray-500 print:text-black">({weekRanges[0]})</span>
                    </th>
                    <th colSpan={2} className="p-1 border-2 border-black text-[9px]">
                      2ª Semana
                      <span className="block text-[8px] font-normal text-gray-500 print:text-black">({weekRanges[1]})</span>
                    </th>
                    <th colSpan={2} className="p-1 border-2 border-black text-[9px]">
                      3ª Semana
                      <span className="block text-[8px] font-normal text-gray-500 print:text-black">({weekRanges[2]})</span>
                    </th>
                    <th colSpan={2} className="p-1 border-2 border-black text-[9px]">
                      4ª Semana
                      <span className="block text-[8px] font-normal text-gray-500 print:text-black">({weekRanges[3]})</span>
                    </th>
                    <th colSpan={2} className="p-1 border-2 border-black text-[9px]">
                      5ª Semana
                      <span className="block text-[8px] font-normal text-gray-500 print:text-black">({weekRanges[4]})</span>
                    </th>
                  </tr>
                  <tr className="bg-gray-200 border-2 border-black text-[9px]">
                    <th className="p-1 border-2 border-black w-8">{getIsExamWeek(0) ? 'VP' : 'AP'}</th>
                    <th className="p-1 border-2 border-black w-8">{getIsExamWeek(0) ? 'VD' : 'AD'}</th>
                    <th className="p-1 border-2 border-black w-8">{getIsExamWeek(1) ? 'VP' : 'AP'}</th>
                    <th className="p-1 border-2 border-black w-8">{getIsExamWeek(1) ? 'VD' : 'AD'}</th>
                    <th className="p-1 border-2 border-black w-8">{getIsExamWeek(2) ? 'VP' : 'AP'}</th>
                    <th className="p-1 border-2 border-black w-8">{getIsExamWeek(2) ? 'VD' : 'AD'}</th>
                    <th className="p-1 border-2 border-black w-8">{getIsExamWeek(3) ? 'VP' : 'AP'}</th>
                    <th className="p-1 border-2 border-black w-8">{getIsExamWeek(3) ? 'VD' : 'AD'}</th>
                    <th className="p-1 border-2 border-black w-8">{getIsExamWeek(4) ? 'VP' : 'AP'}</th>
                    <th className="p-1 border-2 border-black w-8">{getIsExamWeek(4) ? 'VD' : 'AD'}</th>
                    <th className="p-1 border-2 border-black w-8">AP/VP</th>
                    <th className="p-1 border-2 border-black w-8">AD/VD</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const row = dados[falhaDocenteIdx];
                    return (
                      <tr className="border-2 border-black font-semibold">
                        <td className="p-1.5 border-2 border-black">1</td>
                        <td className="p-1.5 border-2 border-black text-left w-44">
                          {row.docente_nome}
                        </td>
                        
                        <td className="p-1.5 border-2 border-black">{getWeekProgramadas(row, 0)}</td>
                        <td className="p-1.5 border-2 border-black">{getWeekDadas(row, 0)}</td>
                        <td className="p-1.5 border-2 border-black">{getWeekProgramadas(row, 1)}</td>
                        <td className="p-1.5 border-2 border-black">{getWeekDadas(row, 1)}</td>
                        <td className="p-1.5 border-2 border-black">{getWeekProgramadas(row, 2)}</td>
                        <td className="p-1.5 border-2 border-black">{getWeekDadas(row, 2)}</td>
                        <td className="p-1.5 border-2 border-black">{getWeekProgramadas(row, 3)}</td>
                        <td className="p-1.5 border-2 border-black">{getWeekDadas(row, 3)}</td>
                        <td className="p-1.5 border-2 border-black">{getWeekProgramadas(row, 4)}</td>
                        <td className="p-1.5 border-2 border-black">{getWeekDadas(row, 4)}</td>

                         <td className="p-1.5 border-2 border-black font-semibold">{getDocenteTotalProgramadas(row)}</td>
                        <td className="p-1.5 border-2 border-black font-extrabold">{getDocenteTotalDadas(row)}</td>
                        
                        <td className="p-1.5 border-2 border-black font-medium">
                          {formatarValor(getDocenteTotalProgramadas(row) * 500)}
                        </td>
                        <td className="p-1.5 border-2 border-black font-extrabold bg-yellow-100">
                          {formatarValor(getDocenteTotalDadas(row) * 500)}
                        </td>
                      </tr>
                    );
                  })()}
                </tbody>
              </table>
            </div>
            
            <p>
              Por ser verdade e para os devidos efeitos, lavrou-se a presente justificação que vai ser assinada pelo Diretor do Curso respectivo para ser submetida aos Serviços de Administração e Finanças do ISPT.
            </p>
          </div>

          <div className="mt-20 text-center space-y-10 px-4 sm:px-8 max-w-4xl mx-auto w-full print-no-break">
            <p className="text-sm">Tete, {new Date().getDate()} de {meses[new Date().getMonth()]} de {new Date().getFullYear()}</p>
            <p className="font-bold uppercase tracking-wider text-xs">O Director do Curso</p>

            <div className="flex flex-col items-center gap-8 mt-12 w-full">
               <div className="space-y-2 text-center">
                 <div className="h-10 flex items-end justify-center">
                   <div className="border-b border-black w-60"></div>
                 </div>
                 <p className="text-xs font-semibold">
                   {cursoId === 2 ? 'MSc. Almeida Ismael de Albuquerque' : 
                    cursoId === 3 ? 'MSc. Lucas Jordão Simoco' : 
                    cursoId === 4 ? 'MSc. Luís Jorge Nhacanhaca' : ''}
                 </p>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RelatoriosPage;
