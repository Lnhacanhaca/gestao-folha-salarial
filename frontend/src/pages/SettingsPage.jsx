import React, { useState } from 'react';
import { Download, Upload, AlertTriangle, Loader2 } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const SettingsPage = () => {
  const [file, setFile] = useState(null);
  const [restoring, setRestoring] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleDownloadBackup = async () => {
    try {
      setDownloading(true);
      const response = await api.get('/settings/backup', { responseType: 'blob' });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `backup_${new Date().toISOString().slice(0,10)}.sql`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Backup gerado com sucesso!');
    } catch (err) {
      toast.error('Erro ao gerar backup.');
    } finally {
      setDownloading(false);
    }
  };

  const handleRestore = async () => {
    if (!file) return toast.error('Selecione um ficheiro de backup primeiro.');
    
    if (!window.confirm('ATENÇÃO: Restaurar o backup irá apagar e substituir TODOS os dados atuais. Tem a certeza absoluta que deseja continuar?')) {
      return;
    }

    try {
      setRestoring(true);
      const formData = new FormData();
      formData.append('file', file);
      
      await api.post('/settings/restore', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      toast.success('Base de dados restaurada com sucesso! O sistema está a reiniciar.');
      
      // Esperar que o backend reinicie e recarregar a página
      setTimeout(() => {
        window.location.reload();
      }, 3000);
      
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erro ao restaurar backup.');
    } finally {
      setRestoring(false);
      setFile(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in zoom-in duration-300">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-800">Configurações</h1>
        <p className="text-muted-foreground mt-1">
          Gerencie o backup e o restauro da base de dados do sistema.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Backup Card */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-xl text-primary">
              <Download size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold">Fazer Backup</h2>
              <p className="text-sm text-slate-500">Descarregar cópia de segurança</p>
            </div>
          </div>
          
          <p className="text-sm text-slate-600">
            Guarde um backup completo com todos os dados atuais do sistema para segurança.
          </p>

          <button
            onClick={handleDownloadBackup}
            disabled={downloading}
            className="w-full flex justify-center items-center gap-2 bg-primary hover:bg-primary/90 text-white font-bold py-3 px-4 rounded-xl transition-all disabled:opacity-50"
          >
            {downloading ? <Loader2 className="animate-spin" size={20} /> : <Download size={20} />}
            {downloading ? 'Gerando Backup...' : 'Descarregar Backup'}
          </button>
        </div>

        {/* Restore Card */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border space-y-4 border-destructive/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none text-destructive">
             <AlertTriangle size={120} />
          </div>
          <div className="flex items-center gap-3 relative z-10">
            <div className="p-3 bg-destructive/10 rounded-xl text-destructive">
              <Upload size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-destructive">Restaurar Backup</h2>
              <p className="text-sm text-slate-500">Substituir dados atuais</p>
            </div>
          </div>
          
          <p className="text-sm text-slate-600 relative z-10">
            Faça upload de um ficheiro de backup gerado anteriormente. <strong>Isto apagará os dados atuais.</strong>
          </p>

          <div className="space-y-3 relative z-10">
            <input
              type="file"
              accept=".sql,.sqlite"
              onChange={(e) => setFile(e.target.files[0])}
              className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
            />
            
            <button
              onClick={handleRestore}
              disabled={restoring || !file}
              className="w-full flex justify-center items-center gap-2 bg-destructive hover:bg-destructive/90 text-white font-bold py-3 px-4 rounded-xl transition-all disabled:opacity-50"
            >
              {restoring ? <Loader2 className="animate-spin" size={20} /> : <AlertTriangle size={20} />}
              {restoring ? 'Restaurando...' : 'Restaurar Base de Dados'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
