import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import { Upload, Plus, Trash2, Save, FileSpreadsheet, Loader2 } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const ImportarPage = () => {
  const { user } = useAuth();
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [ano, setAno] = useState(new Date().getFullYear());
  const [cursoId, setCursoId] = useState(user?.curso_id || 2);
  const [dados, setDados] = useState([]);
  const [loading, setLoading] = useState(false);

  const meses = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          // Logic to map CSV columns to our JSON structure
          // This depends on the legacy CSV format. 
          // For now, let's assume a standard format or provide a mock mapper.
          const mapped = results.data.map(row => ({
            docente_nome: row.Docente || row.Nome || row['Nome do Docente'],
            semanas: [
              { semana: 1, ap: parseFloat(row.W1_AP) || 0, ad: parseFloat(row.W1_AD) || 0 },
              { semana: 2, ap: parseFloat(row.W2_AP) || 0, ad: parseFloat(row.W2_AD) || 0 },
              { semana: 3, ap: parseFloat(row.W3_AP) || 0, ad: parseFloat(row.W3_AD) || 0 },
              { semana: 4, ap: parseFloat(row.W4_AP) || 0, ad: parseFloat(row.W4_AD) || 0 },
              { semana: 5, ap: parseFloat(row.W5_AP) || 0, ad: parseFloat(row.W5_AD) || 0 },
            ]
          }));
          setDados(mapped);
        }
      });
    }
  };

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
    
    // Validation: AD cannot be greater than AP
    if (field === 'ad' && val > newDados[docIndex].semanas[weekIndex].ap) {
      alert('Erro: Aulas Dadas (AD) não podem ser maiores que Programadas (AP)');
      return;
    }

    newDados[docIndex].semanas[weekIndex][field] = val;
    setDados(newDados);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await api.post('/folhas/importar', {
        mes,
        ano,
        curso_id: cursoId,
        dados
      });
      alert('Dados salvos com sucesso!');
      setDados([]);
    } catch (err) {
      alert('Erro ao salvar dados: ' + (err.response?.data?.error?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const calculateTotal = (semanas, field) => {
    return semanas.reduce((acc, s) => acc + (s[field] || 0), 0);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Lançamento de Horas</h1>
          <p className="text-muted-foreground">Introduza manualmente ou importe um ficheiro CSV</p>
        </div>

        <div className="flex items-center gap-3">
          <label className="bg-secondary hover:bg-secondary/80 text-foreground px-4 py-2 rounded-lg cursor-pointer transition-colors flex items-center gap-2 font-medium">
            <Upload size={18} />
            Importar CSV
            <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
          </label>
          <button 
            onClick={handleSave}
            disabled={loading || dados.length === 0}
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
            disabled={user?.role !== 'ADMIN'}
            className="w-full bg-background border rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-primary/20 disabled:bg-muted"
          >
            <option value={1}>Geral (Consolidado)</option>
            <option value={2}>Contabilidade e Auditoria e Contabilidade e Admin Pública</option>
            <option value={3}>Engenharia de Minas e Processamento Mineral</option>
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
                  <td className="p-2">
                    <input 
                      type="text" 
                      value={doc.docente_nome} 
                      onChange={(e) => {
                        const n = [...dados];
                        n[dIdx].docente_nome = e.target.value;
                        setDados(n);
                      }}
                      placeholder="Nome do Docente"
                      className="w-full bg-transparent border-none focus:ring-0 font-medium"
                    />
                  </td>
                  {doc.semanas.map((s, sIdx) => (
                    <React.Fragment key={sIdx}>
                      <td className="p-2 border-l">
                        <input 
                          type="number" 
                          value={s.ap} 
                          onChange={(e) => updateCell(dIdx, sIdx, 'ap', e.target.value)}
                          className="w-16 text-center bg-transparent border-none focus:ring-0"
                        />
                      </td>
                      <td className="p-2">
                        <input 
                          type="number" 
                          value={s.ad} 
                          onChange={(e) => updateCell(dIdx, sIdx, 'ad', e.target.value)}
                          className="w-16 text-center bg-transparent border-none focus:ring-0 text-primary font-bold"
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
                      className="text-destructive hover:bg-destructive/10 p-2 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {dados.length === 0 && (
                <tr>
                  <td colSpan={14} className="p-12 text-center text-muted-foreground italic">
                    Nenhum docente adicionado. Comece por importar um CSV ou adicionar manualmente.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t bg-secondary/10">
          <button 
            onClick={addDocente}
            className="flex items-center gap-2 text-primary font-bold hover:underline"
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
