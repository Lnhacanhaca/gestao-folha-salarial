import React, { useState, useEffect } from 'react';
import { Printer, FileText, Loader2 } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { numeroPorExtenso } from '../lib/extenso';

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

const RelatoriosPage = () => {
  const { user } = useAuth();
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [ano, setAno] = useState(new Date().getFullYear());
  const [cursoId, setCursoId] = useState(user?.curso_id || 1);
  const [dados, setDados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('folha'); // 'folha' or 'oficio'

  const totalGeralAd = dados.reduce((acc, r) => acc + (r.total_ad || 0), 0);
  const valorTotalMts = totalGeralAd * 500;
  const valorExtenso = numeroPorExtenso(valorTotalMts);

  const meses = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const fetchData = async () => {
    setLoading(true);
    try {
      let endpoint = `/folhas/curso/${cursoId}?mes=${mes}&ano=${ano}`;
      if (cursoId === 1) {
        endpoint = `/folhas/geral?mes=${mes}&ano=${ano}`;
      }
      const { data } = await api.get(endpoint);
      setDados(data);
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
      setCursoId(user.curso_id || 2);
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
          @media screen {
            body,
            .min-h-screen,
            main,
            .bg-\\[\\#f8fafc\\] {
              background-color: white !important;
            }
          }
          @media print {
            @page {
              size: ${viewMode === 'oficio' ? 'A4 portrait' : 'A4 landscape'};
              margin: 0;
            }
            body {
              margin: 0 !important;
              padding: ${viewMode === 'oficio' ? '2.0cm 2.0cm 2.0cm 2.5cm' : '1.2cm 1.0cm'} !important;
              background-color: white !important;
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
          }
        `}
      </style>

      {/* Header - No Print */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <h1 className="text-3xl font-bold">Relatórios e Folhas</h1>
          <p className="text-muted-foreground">Visualize e imprima as folhas de pagamento mensais</p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          {cursoId === 1 && (
            <button 
              onClick={() => {
                setViewMode('oficio');
                const originalTitle = document.title;
                document.title = `Oficio mês ${meses[mes-1]}`;
                setTimeout(() => {
                  window.print();
                  setTimeout(() => {
                    document.title = originalTitle;
                  }, 1000);
                }, 150);
              }}
              className="bg-secondary hover:bg-secondary/90 text-foreground px-5 py-2.5 rounded-xl transition-all flex items-center gap-2 font-bold shadow-sm flex-1 sm:flex-none justify-center"
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
            className="bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-xl transition-all flex items-center gap-2 font-bold shadow-lg shadow-primary/20 flex-1 sm:flex-none justify-center"
          >
            <Printer size={18} />
            Imprimir Folha
          </button>
        </div>
      </div>

      {/* Selectors - No Print */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 bg-card p-6 rounded-2xl border shadow-sm no-print">
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
        <div className="space-y-2 sm:col-span-2 md:col-span-1">
          <label className="text-sm font-semibold text-muted-foreground">Curso</label>
          <select 
            value={cursoId} 
            onChange={(e) => setCursoId(parseInt(e.target.value))}
            disabled={user?.role !== 'ADMIN'}
            className="w-full bg-background border rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-primary/20 disabled:bg-muted font-medium"
          >
            <option value={1}>Geral (Todos os Cursos)</option>
            <option value={2}>Contabilidade e Auditoria e Contabilidade e Administração Pública</option>
            <option value={3}>Engenharia de Minas e Engenharia de Processamento Mineral</option>
            <option value={4}>Engenharia Informática</option>
          </select>
        </div>
      </div>

      {/* Ofício - Print Ready (Only for Geral) */}
      {cursoId === 1 && !loading && viewMode === 'oficio' && (
        <div className="bg-white text-black p-8 border-0 shadow-none min-h-[1000px] flex flex-col justify-between print:p-0 print:border-0 print:shadow-none">
          <div>
            <div className="text-center mb-8">
              <img src="/emblema.png" alt="República de Moçambique" className="h-24 mx-auto mb-2 object-contain" />
              <h2 className="font-bold uppercase text-xs sm:text-sm tracking-wider">República de Moçambique</h2>
              <div className="my-6">
                <h2 className="text-sm sm:text-base font-bold uppercase tracking-wide">Instituto Superior Politécnico de Tete</h2>
                <h3 className="font-bold uppercase text-xs sm:text-sm">(ISPT)</h3>
              </div>
            </div>

            <div className="mt-16 space-y-12 px-4 sm:px-8 max-w-4xl mx-auto text-justify text-sm">
              <p className="font-bold">
                Para: Director Geral Adjunto por Área de Administração e Finanças
              </p>

              <p>
                <span className="font-bold">Assunto:</span> <span className="underline">Pagamento de Salário referente ao mês de {meses[mes-1]} de {ano}</span>
              </p>

              <div className="space-y-6 leading-relaxed">
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
            </div>
          </div>

          <div className="mt-20 text-center space-y-10 px-4 sm:px-8 max-w-4xl mx-auto w-full print-no-break">
            <p className="text-sm">Tete, {new Date().getDate()} de {meses[new Date().getMonth()]} de {new Date().getFullYear()}</p>
            <p className="font-bold uppercase tracking-wider text-xs">Os Directores de Curso</p>

            <div className="flex flex-col sm:flex-row justify-around items-center gap-8 mt-12 w-full">
              <div className="space-y-2">
                <div className="border-b border-black w-52"></div>
                <p className="text-xs font-semibold">/MSc. Lucas Jordão Simoco/</p>
              </div>
              <div className="space-y-2">
                <div className="border-b border-black w-52"></div>
                <p className="text-xs font-semibold">/MSc. Almeida Albuquerque/</p>
              </div>
              <div className="space-y-2">
                <div className="border-b border-black w-52"></div>
                <p className="text-xs font-semibold">/MSc. Luís Jorge Nhacanhaca/</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Report Sheet - Print Ready */}
      {viewMode === 'folha' && (
        <div className="bg-white text-black p-8 border-0 shadow-none min-h-[1000px] print:p-0 print:border-0 print:shadow-none">
          <div className="text-center mb-6">
            <div className="flex justify-center mb-2">
              <img src="/logo.png" alt="Instituto Superior Politécnico de Tete" className="h-16 object-contain" />
            </div>
            <h3 className="text-sm sm:text-base font-bold uppercase mt-2 leading-snug">
              {cursoId === 1 ? 'Direcção do Curso Nocturno' : 
               cursoId === 2 ? 'Direcção do Curso Contabilidade e Auditoria e Contabilidade e Administração Pública Pos-laboral' :
               cursoId === 3 ? 'Direcção do Curso Engenharia de Minas e Engenharia de Processamento Mineral Pos-laboral' :
               cursoId === 4 ? 'Direcção do Curso Engenharia Informática Pos-laboral' : ''}
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
                      <th rowSpan={3} className="p-1.5 border-2 border-black w-56 text-left">Docentes</th>
                      <th colSpan={10} className="p-1.5 border-2 border-black">Aulas Mensais</th>
                      <th colSpan={2} rowSpan={2} className="p-1.5 border-2 border-black">Total de Horas</th>
                      <th colSpan={2} rowSpan={2} className="p-1.5 border-2 border-black">Valor a Receber das Aulas</th>
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
                      <th className="p-1 border-2 border-black w-8">AP</th>
                      <th className="p-1 border-2 border-black w-8">AD</th>
                      <th className="p-1 border-2 border-black w-8">AP</th>
                      <th className="p-1 border-2 border-black w-8">AD</th>
                      <th className="p-1 border-2 border-black w-8">AP</th>
                      <th className="p-1 border-2 border-black w-8">AD</th>
                      <th className="p-1 border-2 border-black w-8">AP</th>
                      <th className="p-1 border-2 border-black w-8">AD</th>
                      <th className="p-1 border-2 border-black w-8">AP</th>
                      <th className="p-1 border-2 border-black w-8">AD</th>
                      <th className="p-1 border-2 border-black">Programadas</th>
                      <th className="p-1 border-2 border-black">Dadas</th>
                      <th className="p-1 border-2 border-black">Programadas</th>
                      <th className="p-1 border-2 border-black">Dadas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dados.map((row, idx) => {
                      const s = row.semanas || Array(5).fill({ap: 0, ad: 0});
                      const s1 = s[0] || {ap: 0, ad: 0};
                      const s2 = s[1] || {ap: 0, ad: 0};
                      const s3 = s[2] || {ap: 0, ad: 0};
                      const s4 = s[3] || {ap: 0, ad: 0};
                      const s5 = s[4] || {ap: 0, ad: 0};

                      return (
                        <tr key={idx} className="border-2 border-black hover:bg-gray-50">
                          <td className="p-1.5 border-2 border-black">{idx + 1}</td>
                          <td className="p-1.5 border-2 border-black text-left font-medium">
                            {row.docente_nome}
                            {(row.retificada === 1 || row.retificada === true) && (
                              <span className="text-[8px] text-amber-600 font-extrabold ml-1 print:text-black">
                                (Retificada)
                              </span>
                            )}
                          </td>
                          
                          <td className="p-1.5 border-2 border-black">{s1.ap || 0}</td>
                          <td className="p-1.5 border-2 border-black">{s1.ad || 0}</td>
                          <td className="p-1.5 border-2 border-black">{s2.ap || 0}</td>
                          <td className="p-1.5 border-2 border-black">{s2.ad || 0}</td>
                          <td className="p-1.5 border-2 border-black">{s3.ap || 0}</td>
                          <td className="p-1.5 border-2 border-black">{s3.ad || 0}</td>
                          <td className="p-1.5 border-2 border-black">{s4.ap || 0}</td>
                          <td className="p-1.5 border-2 border-black">{s4.ad || 0}</td>
                          <td className="p-1.5 border-2 border-black">{s5.ap || 0}</td>
                          <td className="p-1.5 border-2 border-black">{s5.ad || 0}</td>

                          <td className="p-1.5 border-2 border-black font-semibold">{row.total_ap}</td>
                          <td className="p-1.5 border-2 border-black font-extrabold">{row.total_ad}</td>
                          
                          <td className="p-1.5 border-2 border-black">
                            {formatarValor(row.total_ap * 500)}
                          </td>
                          <td className="p-1.5 border-2 border-black font-extrabold">
                            {formatarValor(row.total_ad * 500)}
                          </td>
                        </tr>
                      );
                    })}
                    {/* Total Row */}
                    <tr className="border-2 border-black bg-gray-200 font-bold">
                      <td colSpan={2} className="p-1.5 text-center">Total Geral</td>
                      
                      <td className="p-1.5 border-2 border-black">{dados.reduce((acc, r) => acc + ((r.semanas?.[0]?.ap) || 0), 0)}</td>
                      <td className="p-1.5 border-2 border-black">{dados.reduce((acc, r) => acc + ((r.semanas?.[0]?.ad) || 0), 0)}</td>
                      <td className="p-1.5 border-2 border-black">{dados.reduce((acc, r) => acc + ((r.semanas?.[1]?.ap) || 0), 0)}</td>
                      <td className="p-1.5 border-2 border-black">{dados.reduce((acc, r) => acc + ((r.semanas?.[1]?.ad) || 0), 0)}</td>
                      <td className="p-1.5 border-2 border-black">{dados.reduce((acc, r) => acc + ((r.semanas?.[2]?.ap) || 0), 0)}</td>
                      <td className="p-1.5 border-2 border-black">{dados.reduce((acc, r) => acc + ((r.semanas?.[2]?.ad) || 0), 0)}</td>
                      <td className="p-1.5 border-2 border-black">{dados.reduce((acc, r) => acc + ((r.semanas?.[3]?.ap) || 0), 0)}</td>
                      <td className="p-1.5 border-2 border-black">{dados.reduce((acc, r) => acc + ((r.semanas?.[3]?.ad) || 0), 0)}</td>
                      <td className="p-1.5 border-2 border-black">{dados.reduce((acc, r) => acc + ((r.semanas?.[4]?.ap) || 0), 0)}</td>
                      <td className="p-1.5 border-2 border-black">{dados.reduce((acc, r) => acc + ((r.semanas?.[4]?.ad) || 0), 0)}</td>

                      <td className="p-1.5 border-2 border-black">{dados.reduce((acc, r) => acc + (r.total_ap || 0), 0)}</td>
                      <td className="p-1.5 border-2 border-black">{dados.reduce((acc, r) => acc + (r.total_ad || 0), 0)}</td>
                      
                      <td className="p-1.5 border-2 border-black">
                        {formatarValor(dados.reduce((acc, r) => acc + (r.total_ap || 0), 0) * 500)}
                      </td>
                      <td className="p-1.5 border-2 border-black bg-yellow-100 text-[11px] font-black text-black">
                        {formatarValor(dados.reduce((acc, r) => acc + (r.total_ad || 0), 0) * 500)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex justify-end">
                <div className="border-2 border-black p-2 bg-gray-50 text-right min-w-[280px]">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-black block">Valor Total a ser Remunerado:</span>
                  <span className="text-sm font-black text-black block mt-0.5">
                    {formatarValor(dados.reduce((acc, r) => acc + (r.total_ad || 0), 0) * 500)}
                  </span>
                </div>
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
                   <p className="text-[10px] font-semibold">Msc. Almeida Albuquerque</p>
                 </div>
                 <div className="text-center space-y-6 flex-1 max-w-[200px]">
                   <p className="text-[9px] font-bold uppercase tracking-wider leading-tight">O Coordenador de Curso (EM/EPM)</p>
                   <div className="h-10 flex items-end justify-center">
                     <div className="border-b border-black w-40"></div>
                   </div>
                   <p className="text-[10px] font-semibold">Msc. Lucas Simoco</p>
                 </div>
                 <div className="text-center space-y-6 flex-1 max-w-[200px]">
                   <p className="text-[9px] font-bold uppercase tracking-wider leading-tight">O Coordenador de Curso (EI)</p>
                   <div className="h-10 flex items-end justify-center">
                     <div className="border-b border-black w-40"></div>
                   </div>
                   <p className="text-[10px] font-semibold">Msc. Luís Jorge Nhacanhaca</p>
                 </div>
               </>
            ) : (
               // Single Course View - Beautifully Centered
               <div className="text-center space-y-6 max-w-lg mx-auto flex-1">
                 <p className="text-[9px] sm:text-xs font-bold uppercase tracking-wider leading-snug">
                   {cursoId === 2 ? 'O Director do Curso Contabilidade e Auditoria e Contabilidade e Administração Pública Pos-laboral' :
                    cursoId === 3 ? 'O Director do Curso Engenharia de Minas e Engenharia de Processamento Mineral Pos-laboral' :
                    cursoId === 4 ? 'O Director do Curso Engenharia Informática Pos-laboral' : ''}
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
    </div>
  );
};

export default RelatoriosPage;
