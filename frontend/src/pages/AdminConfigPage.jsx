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
  Moon
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
