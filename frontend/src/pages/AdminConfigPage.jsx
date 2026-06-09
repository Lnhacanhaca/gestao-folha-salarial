import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Download, 
  UploadCloud, 
  AlertTriangle, 
  Database, 
  RefreshCw, 
  FileJson,
  CheckCircle,
  HelpCircle,
  Palette,
  Sun,
  Moon,
  Calendar,
  ShieldAlert,
  Trash2,
  Clock,
  Plus
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../services/api';

const applyThemeColor = (color) => {
  const root = document.documentElement;
  switch (color) {
    case 'green':
      root.style.setProperty('--primary', '142 70% 45%');
      break;
    case 'purple':
      root.style.setProperty('--primary', '271 76% 53%');
      break;
    case 'orange':
      root.style.setProperty('--primary', '24 95% 53%');
      break;
    case 'pink':
      root.style.setProperty('--primary', '326 100% 60%');
      break;
    case 'blue':
    default:
      root.style.setProperty('--primary', '207 90% 54%');
      break;
  }
};

const AdminConfigPage = () => {
  const [backingUp, setBackingUp] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  
  // Theme state
  const [themeMode, setThemeMode] = useState(() => localStorage.getItem('themeMode') || 'light');
  const [themeColor, setThemeColor] = useState(() => localStorage.getItem('themeColor') || 'blue');

  // Exceções de Prazo state
  const [excecoes, setExcecoes] = useState([]);
  const [loadingExcecoes, setLoadingExcecoes] = useState(false);
  const [newExcecao, setNewExcecao] = useState({
    curso_id: 2,
    mes: new Date().getMonth() + 1,
    ano: new Date().getFullYear(),
    data_limite: '',
    motivo: ''
  });

  // Limpeza de Lançamentos state
  const [diretores, setDiretores] = useState([]);
  const [cleanForm, setCleanForm] = useState({
    mode: 'course', // 'course' or 'director'
    curso_id: 1, // default to Geral (Todos os cursos)
    diretor_id: '',
    mes: new Date().getMonth() + 1,
    ano: new Date().getFullYear()
  });
  const [cleaning, setCleaning] = useState(false);

  const fetchExcecoes = async () => {
    setLoadingExcecoes(true);
    try {
      const { data } = await api.get('/admin/excecoes');
      setExcecoes(data);
    } catch (err) {
      console.error('Erro ao buscar exceções:', err);
    } finally {
      setLoadingExcecoes(false);
    }
  };

  const fetchDiretores = async () => {
    try {
      const { data } = await api.get('/users');
      const filtered = data.filter(u => u.role === 'DIRETOR_CURSO');
      setDiretores(filtered);
      if (filtered.length > 0) {
        setCleanForm(prev => ({ ...prev, diretor_id: filtered[0].id }));
      }
    } catch (err) {
      console.error('Erro ao buscar utilizadores/diretores:', err);
    }
  };

  useEffect(() => {
    fetchExcecoes();
    fetchDiretores();
  }, []);

  const handleAddExcecao = async (e) => {
    e.preventDefault();
    if (!newExcecao.data_limite) {
      toast.error('Por favor, defina a data limite para a exceção.');
      return;
    }
    const toastId = toast.loading('A criar exceção de prazo...');
    try {
      await api.post('/admin/excecoes', {
        curso_id: parseInt(newExcecao.curso_id),
        mes: parseInt(newExcecao.mes),
        ano: parseInt(newExcecao.ano),
        data_limite: new Date(newExcecao.data_limite).toISOString(),
        motivo: newExcecao.motivo
      });
      toast.success('Exceção de prazo aberta com sucesso!', { id: toastId });
      setNewExcecao({
        curso_id: 2,
        mes: new Date().getMonth() + 1,
        ano: new Date().getFullYear(),
        data_limite: '',
        motivo: ''
      });
      fetchExcecoes();
    } catch (error) {
      toast.error('Erro ao abrir exceção: ' + (error.response?.data?.error || error.message), { id: toastId });
    }
  };

  const handleDeleteExcecao = async (id) => {
    const toastId = toast.loading('A remover exceção...');
    try {
      await api.delete(`/admin/excecoes/${id}`);
      toast.success('Exceção de prazo removida com sucesso!', { id: toastId });
      fetchExcecoes();
    } catch (error) {
      toast.error('Erro ao remover exceção: ' + (error.response?.data?.error || error.message), { id: toastId });
    }
  };

  const handleBackup = async () => {
    setBackingUp(true);
    const toastId = toast.loading('A preparar cópia de segurança...');
    try {
      const { data } = await api.get('/admin/backup');
      
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
        JSON.stringify(data, null, 2)
      )}`;
      
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', jsonString);
      downloadAnchor.setAttribute(
        'download', 
        `sgfs_backup_${new Date().toISOString().slice(0, 10)}.json`
      );
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      toast.success('Cópia de segurança (backup) descarregada com sucesso!', { id: toastId });
    } catch (error) {
      toast.error('Erro ao realizar backup: ' + (error.response?.data?.message || error.message), { id: toastId });
    } finally {
      setBackingUp(false);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
        toast.error('Por favor, selecione um ficheiro JSON válido.');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleRestore = () => {
    if (!selectedFile) {
      toast.error('Por favor, selecione um ficheiro de backup primeiro.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const backupData = JSON.parse(e.target.result);
        
        toast((t) => (
          <div className="flex flex-col gap-3">
            <p className="font-bold text-destructive flex items-center gap-1.5 uppercase">
              <AlertTriangle size={16} />
              Aviso Crítico de Substituição
            </p>
            <p className="text-sm font-semibold text-slate-700">
              Esta ação irá substituir permanentemente todos os dados atuais (Docentes, Folhas, Históricos e Utilizadores) pelos dados deste backup.
            </p>
            <p className="text-xs font-bold text-red-500">
              Esta ação NÃO pode ser desfeita!
            </p>
            <div className="flex justify-end gap-2 mt-2">
              <button 
                onClick={() => toast.dismiss(t.id)} 
                className="px-3 py-1.5 text-xs font-bold bg-secondary hover:bg-secondary/80 rounded-lg transition-colors border"
              >
                Cancelar
              </button>
              <button 
                onClick={async () => {
                  toast.dismiss(t.id);
                  await executeRestore(backupData);
                }} 
                className="px-3 py-1.5 text-xs font-bold bg-destructive hover:bg-destructive/90 text-white rounded-lg transition-colors shadow-lg shadow-destructive/10"
              >
                Confirmar Restauro
              </button>
            </div>
          </div>
        ), { duration: Infinity, style: { minWidth: '400px' } });

      } catch (err) {
        toast.error('Erro ao ler o ficheiro JSON. Certifique-se de que é um backup válido.');
      }
    };
    reader.readAsText(selectedFile);
  };

  const executeRestore = async (backupData) => {
    setRestoring(true);
    const toastId = toast.loading('A restaurar base de dados... Por favor, não feche o sistema.');
    try {
      const { data } = await api.post('/admin/restore', backupData);
      toast.success(data.message || 'Restauro concluído com sucesso!', { id: toastId });
      setSelectedFile(null);
      
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      toast.error('Falha no restauro: ' + (error.response?.data?.message || error.message), { id: toastId });
    } finally {
      setRestoring(false);
    }
  };

  const handleCleanLancamentos = async (e) => {
    e.preventDefault();
    
    const mesNome = [
      "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ][cleanForm.mes - 1];

    let targetDescription = "";
    if (cleanForm.mode === 'director') {
      const dir = diretores.find(d => d.id === parseInt(cleanForm.diretor_id));
      targetDescription = `do Diretor de Curso "${dir?.username || ''}"`;
    } else {
      if (parseInt(cleanForm.curso_id) === 1) {
        targetDescription = "de Todos os Cursos (Geral)";
      } else {
        const cursosNomes = {
          2: "Contabilidade e Auditoria",
          3: "Contabilidade e Administração Pública",
          4: "Engenharia de Minas",
          5: "Engenharia de Processamento Mineral",
          6: "Engenharia Informática"
        };
        targetDescription = `do Curso "${cursosNomes[cleanForm.curso_id]}"`;
      }
    }

    toast((t) => (
      <div className="flex flex-col gap-3">
        <p className="font-bold text-destructive flex items-center gap-1.5 uppercase">
          <AlertTriangle size={16} className="shrink-0 animate-bounce" />
          Confirmar Limpeza Permanente
        </p>
        <p className="text-sm font-semibold text-slate-700 leading-normal">
          Tem certeza de que deseja apagar permanentemente todos os lançamentos de horas {targetDescription} para o período de {mesNome} de {cleanForm.ano}?
        </p>
        <p className="text-xs text-red-500 font-bold leading-normal">
          ⚠️ Esta ação apagará as folhas e seus detalhes e NÃO pode ser desfeita!
        </p>
        <div className="flex justify-end gap-2 mt-2">
          <button 
            onClick={() => toast.dismiss(t.id)} 
            className="px-3 py-1.5 text-xs font-bold bg-secondary hover:bg-secondary/80 rounded-lg transition-colors border"
          >
            Cancelar
          </button>
          <button 
            onClick={async () => {
              toast.dismiss(t.id);
              await executeClean();
            }} 
            className="px-3 py-1.5 text-xs font-bold bg-destructive hover:bg-destructive/90 text-white rounded-lg transition-colors shadow-lg"
          >
            Confirmar Limpeza
          </button>
        </div>
      </div>
    ), { duration: Infinity, style: { minWidth: '400px' } });
  };

  const executeClean = async () => {
    setCleaning(true);
    const loadingToast = toast.loading('A apagar lançamentos de horas...');
    try {
      const payload = {
        mes: parseInt(cleanForm.mes),
        ano: parseInt(cleanForm.ano)
      };
      if (cleanForm.mode === 'director') {
        payload.diretor_id = parseInt(cleanForm.diretor_id);
      } else {
        payload.curso_id = parseInt(cleanForm.curso_id);
      }

      const { data } = await api.post('/admin/clean-folhas', payload);
      toast.success(data.message || 'Lançamentos apagados com sucesso!', { id: loadingToast });
    } catch (err) {
      toast.error('Erro ao apagar lançamentos: ' + (err.response?.data?.error?.message || err.response?.data?.error || err.message), { id: loadingToast });
    } finally {
      setCleaning(false);
    }
  };

  // Real-time theme customizer handlers
  const handleToggleDarkMode = () => {
    const nextMode = themeMode === 'light' ? 'dark' : 'light';
    setThemeMode(nextMode);
    localStorage.setItem('themeMode', nextMode);
    if (nextMode === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    toast.success(`Modo ${nextMode === 'dark' ? 'Escuro' : 'Claro'} ativado!`);
  };

  const handleChangeThemeColor = (color) => {
    setThemeColor(color);
    localStorage.setItem('themeColor', color);
    applyThemeColor(color);
    toast.success(`Tema ${color.toUpperCase()} aplicado com sucesso!`);
  };

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header section */}
      <div>
        <h1 className="text-3xl font-black flex items-center gap-2">
          <Settings className="text-primary animate-[spin_8s_linear_infinite]" size={32} />
          Configurações do Sistema
        </h1>
        <p className="text-muted-foreground mt-1">Gira cópias de segurança (backup), restaure dados e defina políticas do sistema</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Backup Card */}
        <div className="bg-card border shadow-sm rounded-3xl p-6 flex flex-col justify-between space-y-6 relative overflow-hidden transition-all duration-300 hover:shadow-md hover:border-slate-200 group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-bl-[100px] flex items-center justify-center transition-all group-hover:bg-primary/10">
            <Database className="text-primary/20 absolute top-5 right-5" size={28} />
          </div>

          <div className="space-y-3">
            <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-primary/10 text-primary">
              <Download size={24} />
            </div>
            <h2 className="text-xl font-bold text-slate-800">Cópia de Segurança (Backup)</h2>
            <p className="text-sm text-slate-500 leading-relaxed font-medium">
              Transfira um ficheiro comprimido contendo todos os dados inseridos no sistema, incluindo a listagem de Docentes, utilizadores, folhas de salário gravadas e registos de auditoria.
            </p>
          </div>

          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1">
              <FileJson size={14} className="text-emerald-500 shrink-0" /> Formato de exportação: JSON
            </span>
            <button
              onClick={handleBackup}
              disabled={backingUp}
              className="bg-primary hover:bg-primary/90 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 shadow-primary/10"
            >
              {backingUp ? <RefreshCw className="animate-spin" size={16} /> : <Download size={16} />}
              Efetuar Backup
            </button>
          </div>
        </div>

        {/* Restore Card */}
        <div className="bg-card border shadow-sm rounded-3xl p-6 flex flex-col justify-between space-y-6 relative overflow-hidden transition-all duration-300 hover:shadow-md hover:border-slate-200 group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-bl-[100px] flex items-center justify-center transition-all group-hover:bg-amber-500/10">
            <UploadCloud className="text-amber-500/20 absolute top-5 right-5" size={28} />
          </div>

          <div className="space-y-3">
            <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-amber-100 text-amber-600">
              <UploadCloud size={24} />
            </div>
            <h2 className="text-xl font-bold text-slate-800">Restaurar Dados</h2>
            <p className="text-sm text-slate-500 leading-relaxed font-medium">
              Submeta um ficheiro de backup previamente exportado no formato JSON para repor todo o estado do sistema. Isso substituirá permanentemente as informações atuais do banco de dados.
            </p>
          </div>

          <div className="pt-4 border-t border-slate-100 space-y-4">
            {/* File drop zone / selector */}
            <div className="relative border-2 border-dashed border-slate-200 rounded-2xl p-4 flex flex-col items-center justify-center hover:bg-slate-50/50 transition-colors">
              <input
                type="file"
                accept=".json,application/json"
                onChange={handleFileChange}
                disabled={restoring}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <FileJson className={selectedFile ? "text-emerald-500" : "text-slate-400"} size={32} />
              <p className="text-xs font-bold text-slate-700 mt-2">
                {selectedFile ? selectedFile.name : "Clique para selecionar ficheiro de backup"}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {selectedFile ? `${(selectedFile.size / 1024).toFixed(2)} KB` : "Apenas ficheiros .json são aceites"}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <span className="text-[10px] text-amber-600 font-extrabold flex items-center gap-1">
                <AlertTriangle size={12} className="shrink-0 animate-pulse" /> Atenção: Irá apagar dados correntes!
              </span>
              <button
                onClick={handleRestore}
                disabled={restoring || !selectedFile}
                className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 shadow-amber-500/10"
              >
                {restoring ? <RefreshCw className="animate-spin" size={16} /> : <UploadCloud size={16} />}
                Restaurar Agora
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Theme customization panel */}
      <div className="bg-card border shadow-sm rounded-3xl p-6 space-y-6 relative overflow-hidden transition-all duration-300 hover:shadow-md">
        <div className="flex items-center gap-2.5 pb-4 border-b">
          <Palette className="text-primary" size={24} />
          <div>
            <h2 className="text-xl font-bold text-slate-800">Personalização do Layout (Tema & Cores)</h2>
            <p className="text-xs text-muted-foreground">Escolha a sua cor primária preferida e o modo de visualização</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Theme Color Selector */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-700">Cor Primária do Template</h3>
            <div className="flex flex-wrap gap-4">
              {[
                { name: 'blue', label: 'Azul Clássico', colorClass: 'bg-[#2563eb]' },
                { name: 'green', label: 'Verde Esmeralda', colorClass: 'bg-[#10b981]' },
                { name: 'purple', label: 'Roxo Moderno', colorClass: 'bg-[#8b5cf6]' },
                { name: 'orange', label: 'Laranja Quente', colorClass: 'bg-[#f97316]' },
                { name: 'pink', label: 'Rosa Vibrante', colorClass: 'bg-[#ec4899]' }
              ].map((c) => (
                <button
                  key={c.name}
                  onClick={() => handleChangeThemeColor(c.name)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl border transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95 ${
                    themeColor === c.name 
                      ? 'border-primary bg-primary/5 font-extrabold text-primary scale-[1.02]' 
                      : 'border-slate-100 bg-slate-50/50 hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <span className={`w-4.5 h-4.5 rounded-full ${c.colorClass} border shrink-0`} />
                  <span className="text-xs font-semibold">{c.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Theme mode toggle */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-700">Modo de Visualização (Template)</h3>
            <div className="flex gap-4">
              <button
                onClick={handleToggleDarkMode}
                className={`flex-1 flex items-center justify-center gap-3 py-3 px-4 rounded-2xl border cursor-pointer transition-all shadow-sm ${
                  themeMode === 'light'
                    ? 'border-primary bg-primary/5 text-primary font-black'
                    : 'border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100'
                }`}
              >
                <Sun size={18} />
                <span className="text-xs font-semibold">Modo Claro</span>
              </button>

              <button
                onClick={handleToggleDarkMode}
                className={`flex-1 flex items-center justify-center gap-3 py-3 px-4 rounded-2xl border cursor-pointer transition-all shadow-sm ${
                  themeMode === 'dark'
                    ? 'border-primary bg-primary/5 text-primary font-black'
                    : 'border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100'
                }`}
              >
                <Moon size={18} />
                <span className="text-xs font-semibold">Modo Escuro</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Exceções de Prazo de Edição */}
      <div className="bg-card border shadow-sm rounded-3xl p-6 space-y-6 relative overflow-hidden transition-all duration-300 hover:shadow-md">
        <div className="flex items-center gap-2.5 pb-4 border-b">
          <ShieldAlert className="text-primary" size={24} />
          <div>
            <h2 className="text-xl font-bold text-slate-800">Exceções de Prazo de Edição (Diretores)</h2>
            <p className="text-xs text-muted-foreground">Abra exceções para permitir que diretores lancem ou editem horas após o dia 15</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Formulário de Criação */}
          <form onSubmit={handleAddExcecao} className="space-y-4 lg:col-span-1 border-r lg:pr-8 border-slate-100">
            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
              <Plus size={16} className="text-primary" />
              Nova Exceção
            </h3>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500">Curso Selecionado</label>
              <select
                value={newExcecao.curso_id}
                onChange={(e) => setNewExcecao({ ...newExcecao, curso_id: e.target.value })}
                className="w-full bg-secondary/50 border-none rounded-xl py-2 px-3 outline-none focus:ring-2 focus:ring-primary/20 text-xs font-medium"
              >
                <option value={2}>Contabilidade e Auditoria</option>
                <option value={3}>Contabilidade e Administração Pública</option>
                <option value={4}>Engenharia de Minas</option>
                <option value={5}>Engenharia de Processamento Mineral</option>
                <option value={6}>Engenharia Informática</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Mês</label>
                <select
                  value={newExcecao.mes}
                  onChange={(e) => setNewExcecao({ ...newExcecao, mes: e.target.value })}
                  className="w-full bg-secondary/50 border-none rounded-xl py-2 px-3 outline-none focus:ring-2 focus:ring-primary/20 text-xs font-medium"
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {new Date(0, i).toLocaleString('pt-PT', { month: 'long' })}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Ano</label>
                <input
                  type="number"
                  value={newExcecao.ano}
                  onChange={(e) => setNewExcecao({ ...newExcecao, ano: e.target.value })}
                  className="w-full bg-secondary/50 border-none rounded-xl py-2 px-3 outline-none focus:ring-2 focus:ring-primary/20 text-xs font-medium"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500">Prazo Limite da Exceção</label>
              <input
                type="datetime-local"
                value={newExcecao.data_limite}
                onChange={(e) => setNewExcecao({ ...newExcecao, data_limite: e.target.value })}
                className="w-full bg-secondary/50 border-none rounded-xl py-2 px-3 outline-none focus:ring-2 focus:ring-primary/20 text-xs font-medium"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500">Motivo / Justificativa</label>
              <textarea
                placeholder="Ex: Diretor doente, prorrogação de prazo acadêmico"
                value={newExcecao.motivo}
                onChange={(e) => setNewExcecao({ ...newExcecao, motivo: e.target.value })}
                rows={2}
                className="w-full bg-secondary/50 border-none rounded-xl py-2 px-3 outline-none focus:ring-2 focus:ring-primary/20 text-xs font-medium resize-none"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90 text-white py-2.5 rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 shadow-primary/10 cursor-pointer"
            >
              <Plus size={14} />
              Criar Exceção
            </button>
          </form>

          {/* Listagem de Exceções */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
              <Clock size={16} className="text-primary animate-[pulse_2s_infinite]" />
              Exceções Ativas e Histórico
            </h3>

            {loadingExcecoes ? (
              <div className="flex items-center justify-center p-8">
                <RefreshCw className="animate-spin text-primary" size={24} />
              </div>
            ) : excecoes.length === 0 ? (
              <div className="p-8 border border-dashed rounded-2xl text-center text-slate-400 space-y-2">
                <ShieldAlert size={28} className="mx-auto text-slate-300" />
                <p className="text-xs font-bold">Nenhuma exceção de prazo aberta atualmente.</p>
                <p className="text-[10px] text-slate-500">Os Diretores de Curso estão sujeitos ao limite regular de 1 a 15 de cada mês.</p>
              </div>
            ) : (
              <div className="space-y-3 overflow-y-auto max-h-[380px] pr-2">
                {excecoes.map((exc) => {
                  const cursoNome = {
                    2: "Contabilidade e Auditoria",
                    3: "Contabilidade e Administração Pública",
                    4: "Engenharia de Minas",
                    5: "Engenharia de Processamento Mineral",
                    6: "Engenharia Informática"
                  }[exc.curso_id] || `Curso ${exc.curso_id}`;

                  const isAtiva = new Date(exc.data_limite) >= new Date();

                  return (
                    <div 
                      key={exc.id} 
                      className={`p-4 border rounded-2xl flex items-center justify-between gap-4 transition-all hover:bg-slate-50/50 ${
                        isAtiva ? 'border-primary/20 bg-primary/[0.01]' : 'border-slate-100 bg-slate-50/30 opacity-70'
                      }`}
                    >
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider ${
                            isAtiva ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                          }`}>
                            {isAtiva ? 'Ativa' : 'Expirada'}
                          </span>
                          <span className="text-xs font-black text-slate-800 truncate">{cursoNome}</span>
                        </div>

                        <p className="text-xs font-bold text-slate-600">
                          Mês de Referência: <span className="text-primary font-black">{new Date(0, exc.mes - 1).toLocaleString('pt-PT', { month: 'long' })} / {exc.ano}</span>
                        </p>

                        <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500">
                          <Calendar size={12} className="shrink-0" />
                          <span>Limite: {new Date(exc.data_limite).toLocaleString('pt-PT')}</span>
                        </div>

                        {exc.motivo && (
                          <p className="text-[10px] text-slate-500 font-medium italic border-l-2 border-slate-200 pl-2 mt-1">
                            Motivo: {exc.motivo}
                          </p>
                        )}
                      </div>

                      <button
                        onClick={() => handleDeleteExcecao(exc.id)}
                        className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-all cursor-pointer hover:scale-105 active:scale-95 border border-transparent hover:border-rose-100 shrink-0"
                        title="Remover Exceção"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Limpeza de Lançamentos de Horas */}
      <div className="bg-card border shadow-sm rounded-3xl p-6 space-y-6 relative overflow-hidden transition-all duration-300 hover:shadow-md">
        <div className="flex items-center gap-2.5 pb-4 border-b">
          <Trash2 className="text-destructive" size={24} />
          <div>
            <h2 className="text-xl font-bold text-slate-800">Limpeza de Lançamentos de Horas</h2>
            <p className="text-xs text-muted-foreground">Apague permanentemente lançamentos de horas de cursos específicos ou diretores</p>
          </div>
        </div>

        <form onSubmit={handleCleanLancamentos} className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500">Modo de Seleção</label>
            <select
              value={cleanForm.mode}
              onChange={(e) => setCleanForm({ ...cleanForm, mode: e.target.value })}
              className="w-full bg-secondary/50 border-none rounded-xl py-2.5 px-3 outline-none focus:ring-2 focus:ring-primary/20 text-xs font-semibold"
            >
              <option value="course">Por Curso</option>
              <option value="director">Por Diretor de Curso</option>
            </select>
          </div>

          {cleanForm.mode === 'course' ? (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500">Curso</label>
              <select
                value={cleanForm.curso_id}
                onChange={(e) => setCleanForm({ ...cleanForm, curso_id: parseInt(e.target.value) })}
                className="w-full bg-secondary/50 border-none rounded-xl py-2.5 px-3 outline-none focus:ring-2 focus:ring-primary/20 text-xs font-semibold"
              >
                <option value={1}>Geral (Todos os Cursos)</option>
                <option value={2}>Contabilidade e Auditoria</option>
                <option value={3}>Contabilidade e Administração Pública</option>
                <option value={4}>Engenharia de Minas</option>
                <option value={5}>Engenharia de Processamento Mineral</option>
                <option value={6}>Engenharia Informática</option>
              </select>
            </div>
          ) : (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500">Diretor de Curso</label>
              <select
                value={cleanForm.diretor_id}
                onChange={(e) => setCleanForm({ ...cleanForm, diretor_id: e.target.value })}
                className="w-full bg-secondary/50 border-none rounded-xl py-2.5 px-3 outline-none focus:ring-2 focus:ring-primary/20 text-xs font-semibold"
              >
                {diretores.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.username} (Gere: {d.curso_id === 2 ? 'CA/CAP' : d.curso_id === 4 ? 'EM/EPM' : d.curso_id === 6 ? 'EI' : d.curso_id})
                  </option>
                ))}
                {diretores.length === 0 && (
                  <option value="">Nenhum diretor cadastrado</option>
                )}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500">Mês</label>
              <select
                value={cleanForm.mes}
                onChange={(e) => setCleanForm({ ...cleanForm, mes: parseInt(e.target.value) })}
                className="w-full bg-secondary/50 border-none rounded-xl py-2.5 px-3 outline-none focus:ring-2 focus:ring-primary/20 text-xs font-semibold"
              >
                {[
                  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
                  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
                ].map((m, i) => (
                  <option key={i} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500">Ano</label>
              <input
                type="number"
                value={cleanForm.ano}
                onChange={(e) => setCleanForm({ ...cleanForm, ano: parseInt(e.target.value) })}
                className="w-full bg-secondary/50 border-none rounded-xl py-2.5 px-3 outline-none focus:ring-2 focus:ring-primary/20 text-xs font-semibold"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={cleaning || (cleanForm.mode === 'director' && !cleanForm.diretor_id)}
            className="w-full bg-destructive hover:bg-destructive/90 disabled:opacity-50 text-white py-2.5 px-4 rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 shadow-destructive/10 cursor-pointer"
          >
            {cleaning ? <RefreshCw className="animate-spin" size={14} /> : <Trash2 size={14} />}
            Apagar Lançamentos
          </button>
        </form>
      </div>

      {/* Security alert callout banner */}
      <div className="bg-amber-50/60 border border-amber-100 rounded-3xl p-6 flex flex-col sm:flex-row gap-4 items-start">
        <div className="p-3 bg-amber-100 rounded-2xl text-amber-600 shrink-0">
          <AlertTriangle size={24} />
        </div>
        <div className="space-y-1">
          <h3 className="font-bold text-amber-800 text-base">Boas Práticas de Segurança</h3>
          <p className="text-sm text-amber-700 leading-relaxed font-medium">
            Recomenda-se a realização de uma cópia de segurança antes de efetuar qualquer alteração em massa no sistema ou renovar semestres. Mantenha os seus ficheiros de backup armazenados num local seguro e protegido.
          </p>
        </div>
      </div>

      {/* Informational settings panel placeholders */}
      <div className="bg-card border shadow-sm rounded-3xl p-6 space-y-4">
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-1.5">
          <HelpCircle size={18} className="text-primary" />
          Outras Definições
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm font-medium">
          <div className="p-4 bg-slate-50/50 rounded-2xl border flex items-center justify-between">
            <div>
              <p className="font-bold text-slate-700">Limpeza de Histórico de Acesso</p>
              <p className="text-xs text-muted-foreground mt-0.5">Controlada a partir do painel de Auditoria</p>
            </div>
            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase rounded-full tracking-wider">Ativo</span>
          </div>

          <div className="p-4 bg-slate-50/50 rounded-2xl border flex items-center justify-between">
            <div>
              <p className="font-bold text-slate-700">Criptografia de Dados (Audit Logs)</p>
              <p className="text-xs text-muted-foreground mt-0.5">Assinaturas SHA-256 ativas no backend</p>
            </div>
            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase rounded-full tracking-wider">Automático</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminConfigPage;
