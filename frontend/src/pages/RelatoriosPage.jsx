import React, { useState, useEffect } from 'react';
import { Printer, FileText, Download, Loader2, ChevronRight } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { numeroPorExtenso } from '../lib/extenso';

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

  const cursos = {
    1: "Geral (Consolidado)",
    2: "Curso de Contabilidade e Auditoria e Contabilidade e Administração Pública - Nocturno",
    3: "Curso de Engenharia de Minas e Processamento Mineral - Nocturno",
    4: "Curso de Engenharia Informática - Nocturno"
  };

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

  // Handle course change to reset view if needed
  useEffect(() => {
    if (cursoId !== 1) setViewMode('folha');
  }, [cursoId]);

  return (
    <div className="space-y-6">
      <style>
        {`
          @media print {
            @page {
              size: ${viewMode === 'oficio' ? 'portrait' : 'landscape'};
              margin: 1cm;
            }
          }
        `}
      </style>

      {/* Header - No Print */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div>
          <h1 className="text-3xl font-bold">Relatórios e Folhas</h1>
          <p className="text-muted-foreground">Visualize e imprima as folhas de pagamento mensais</p>
        </div>

        <div className="flex gap-3">
          {cursoId === 1 && (
            <button 
              onClick={() => {
                setViewMode('oficio');
                setTimeout(() => window.print(), 100);
              }}
              className="bg-secondary hover:bg-secondary/90 text-foreground px-6 py-2 rounded-lg transition-all flex items-center gap-2 font-bold shadow-sm"
            >
              <FileText size={20} />
              Imprimir Ofício
            </button>
          )}
          <button 
            onClick={() => {
              setViewMode('folha');
              setTimeout(() => window.print(), 100);
            }}
            className="bg-primary hover:bg-primary/90 text-white px-6 py-2 rounded-lg transition-all flex items-center gap-2 font-bold shadow-lg shadow-primary/20"
          >
            <Printer size={20} />
            Imprimir Folha
          </button>
        </div>
      </div>

      {/* Selectors - No Print */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-card p-6 rounded-2xl border shadow-sm no-print">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-muted-foreground">Mês</label>
          <select 
            value={mes} 
            onChange={(e) => setMes(parseInt(e.target.value))}
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
            onChange={(e) => setAno(parseInt(e.target.value))}
            className="w-full bg-background border rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-muted-foreground">Curso</label>
          <select 
            value={cursoId} 
            onChange={(e) => setCursoId(parseInt(e.target.value))}
            className="w-full bg-background border rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value={1}>Geral (Todos os Cursos)</option>
            <option value={2}>CA / CAP</option>
            <option value={3}>EM / EPM</option>
            <option value={4}>EI (Electrónica e Informática)</option>
          </select>
        </div>
      </div>

      {/* Ofício - Print Ready (Only for Geral) */}
      {cursoId === 1 && !loading && viewMode === 'oficio' && (
        <div className="bg-white text-black p-8 rounded-2xl border shadow-sm print:shadow-none print:border-none print:p-0 mb-6 min-h-[1000px]">
          <div className="text-center mb-8">
            <img src="/emblema.png" alt="República de Moçambique" className="h-20 mx-auto mb-2 object-contain" />
            <h2 className="font-bold uppercase">República de Moçambique</h2>
            <div className="my-6">
              <h2 className="text-lg font-bold uppercase">Instituto Superior Politécnico Tete</h2>
              <h3 className="font-bold uppercase">(ISPT)</h3>
            </div>
          </div>

          <div className="mt-16 space-y-12 px-8 max-w-4xl mx-auto text-justify">
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
                2. É de referir que o valor total a ser remunerado aos docentes é de <span className="font-bold">{valorTotalMts.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })}Mts</span> ({valorExtenso}).
              </p>
              <p>
                3. À consideração Superior.
              </p>
            </div>

            <div className="mt-20 text-center space-y-6">
              <p>Tete, {new Date().getDate()} de {meses[new Date().getMonth()]} de {new Date().getFullYear()}</p>
              <p>Os Directores de Curso</p>

              <div className="flex flex-col items-center gap-8 mt-12">
                <div className="space-y-2">
                  <div className="border-b border-black w-64"></div>
                  <p className="text-sm">/MSc. Lucas Jordão Simoco/</p>
                </div>
                <div className="space-y-2">
                  <div className="border-b border-black w-64"></div>
                  <p className="text-sm">/MSc. Almeida Albuquerque/</p>
                </div>
                <div className="space-y-2">
                  <div className="border-b border-black w-64"></div>
                  <p className="text-sm">/MSc. Luís Jorge Nhacanhaca/</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Report Sheet - Print Ready */}
      {viewMode === 'folha' && (
        <div className="bg-white text-black p-8 rounded-2xl border shadow-sm min-h-[1000px] print:shadow-none print:border-none print:p-0">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-2">
            <img src="/logo.png" alt="Instituto Superior Politécnico de Tete" className="h-24 object-contain" />
          </div>
          <h3 className="text-lg font-bold uppercase mt-2">
            {cursoId === 1 ? 'Direcção do Curso Nocturno' : `Direcção do ${cursos[cursoId]}`}
          </h3>
          <p className="mt-4 font-bold text-sm">
            Relação das Aulas Dadas por Docentes no Curso Nocturno - Mês de {meses[mes-1]} / {ano}
          </p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center p-20 gap-4">
            <Loader2 className="animate-spin text-primary" size={40} />
            <p className="text-muted-foreground">Processando dados...</p>
          </div>
        ) : (
          <table className="w-full border-collapse text-[10px] text-center">
            <thead>
              <tr className="bg-gray-200 border-2 border-black">
                <th rowSpan={3} className="p-1 border-2 border-black w-8">Nº</th>
                <th rowSpan={3} className="p-1 border-2 border-black w-48 text-left">Docentes</th>
                <th colSpan={10} className="p-1 border-2 border-black">Aulas Mensais</th>
                <th colSpan={2} rowSpan={2} className="p-1 border-2 border-black">Total de Horas</th>
                <th colSpan={2} rowSpan={2} className="p-1 border-2 border-black">Valor a Receber das Aulas</th>
              </tr>
              <tr className="bg-gray-200 border-2 border-black">
                <th colSpan={2} className="p-1 border-2 border-black">1ª Semana</th>
                <th colSpan={2} className="p-1 border-2 border-black">2ª Semana</th>
                <th colSpan={2} className="p-1 border-2 border-black">3ª Semana</th>
                <th colSpan={2} className="p-1 border-2 border-black">4ª Semana</th>
                <th colSpan={2} className="p-1 border-2 border-black">5ª Semana</th>
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
                    <td className="p-1 border-2 border-black">{idx + 1}</td>
                    <td className="p-1 border-2 border-black text-left font-medium">
                      {row.docente_nome}
                      {(row.retificada === 1 || row.retificada === true) && (
                        <span className="text-[8px] text-amber-600 font-extrabold ml-1 uppercase print:text-black">
                          (Retificada)
                        </span>
                      )}
                    </td>
                    
                    <td className="p-1 border-2 border-black">{s1.ap || 0}</td>
                    <td className="p-1 border-2 border-black">{s1.ad || 0}</td>
                    <td className="p-1 border-2 border-black">{s2.ap || 0}</td>
                    <td className="p-1 border-2 border-black">{s2.ad || 0}</td>
                    <td className="p-1 border-2 border-black">{s3.ap || 0}</td>
                    <td className="p-1 border-2 border-black">{s3.ad || 0}</td>
                    <td className="p-1 border-2 border-black">{s4.ap || 0}</td>
                    <td className="p-1 border-2 border-black">{s4.ad || 0}</td>
                    <td className="p-1 border-2 border-black">{s5.ap || 0}</td>
                    <td className="p-1 border-2 border-black">{s5.ad || 0}</td>

                    <td className="p-1 border-2 border-black font-medium">{row.total_ap}</td>
                    <td className="p-1 border-2 border-black font-bold">{row.total_ad}</td>
                    
                    <td className="p-1 border-2 border-black">
                      {(row.total_ap * 500).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-1 border-2 border-black font-bold">
                      {(row.total_ad * 500).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                );
              })}
              {/* Total Row */}
              <tr className="border-2 border-black bg-gray-200 font-bold">
                <td colSpan={2} className="p-1 text-center">Total Geral</td>
                
                <td className="p-1 border-2 border-black">{dados.reduce((acc, r) => acc + ((r.semanas?.[0]?.ap) || 0), 0)}</td>
                <td className="p-1 border-2 border-black">{dados.reduce((acc, r) => acc + ((r.semanas?.[0]?.ad) || 0), 0)}</td>
                <td className="p-1 border-2 border-black">{dados.reduce((acc, r) => acc + ((r.semanas?.[1]?.ap) || 0), 0)}</td>
                <td className="p-1 border-2 border-black">{dados.reduce((acc, r) => acc + ((r.semanas?.[1]?.ad) || 0), 0)}</td>
                <td className="p-1 border-2 border-black">{dados.reduce((acc, r) => acc + ((r.semanas?.[2]?.ap) || 0), 0)}</td>
                <td className="p-1 border-2 border-black">{dados.reduce((acc, r) => acc + ((r.semanas?.[2]?.ad) || 0), 0)}</td>
                <td className="p-1 border-2 border-black">{dados.reduce((acc, r) => acc + ((r.semanas?.[3]?.ap) || 0), 0)}</td>
                <td className="p-1 border-2 border-black">{dados.reduce((acc, r) => acc + ((r.semanas?.[3]?.ad) || 0), 0)}</td>
                <td className="p-1 border-2 border-black">{dados.reduce((acc, r) => acc + ((r.semanas?.[4]?.ap) || 0), 0)}</td>
                <td className="p-1 border-2 border-black">{dados.reduce((acc, r) => acc + ((r.semanas?.[4]?.ad) || 0), 0)}</td>

                <td className="p-1 border-2 border-black">{dados.reduce((acc, r) => acc + (r.total_ap || 0), 0)}</td>
                <td className="p-1 border-2 border-black">{dados.reduce((acc, r) => acc + (r.total_ad || 0), 0)}</td>
                
                <td className="p-1 border-2 border-black">
                  {(dados.reduce((acc, r) => acc + (r.total_ap || 0), 0) * 500).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })}
                </td>
                <td className="p-1 border-2 border-black">
                  {(dados.reduce((acc, r) => acc + (r.total_ad || 0), 0) * 500).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tbody>
          </table>
        )}

        {/* Dynamic Signatures Footer */}
        <div className="mt-20 grid grid-cols-3 gap-8">
          {cursoId === 1 ? (
             // Consolidade View - 3 Director Signatures
             <>
               <div className="text-center space-y-8">
                 <p className="text-sm font-bold">O Coordenador de Curso (CA/CAP)</p>
                 <div className="border-b border-black w-48 mx-auto"></div>
                 <p className="text-xs">Msc. Almeida Albuquerque</p>
               </div>
               <div className="text-center space-y-8">
                 <p className="text-sm font-bold">O Coordenador de Curso (EM/EPM)</p>
                 <div className="border-b border-black w-48 mx-auto"></div>
                 <p className="text-xs">Msc. Lucas Simoco</p>
               </div>
               <div className="text-center space-y-8">
                 <p className="text-sm font-bold">O Coordenador de Curso (EI)</p>
                 <div className="border-b border-black w-48 mx-auto"></div>
                 <p className="text-xs">Msc. Luís Jorge Nhacanhaca</p>
               </div>
             </>
          ) : (
            // Single Course View
            <>
              <div></div>
              <div className="text-center space-y-8">
                <p className="text-sm font-bold">O Director do {cursos[cursoId]}</p>
                <div className="border-b border-black w-64 mx-auto"></div>
                <p className="text-xs">
                  {cursoId === 2 ? '/MSc. Almeida Ismael de Albuquerque/' : 
                   cursoId === 3 ? '/MSc. Lucas Jordão Simoco/' : 
                   cursoId === 4 ? '/MSc. Luís Jorge Nhacanhaca/' : ''}
                </p>
              </div>
              <div></div>
            </>
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
