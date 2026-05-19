import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  ShieldAlert, Search, Trash2, Download, 
  Calendar, User, AlertCircle, CheckCircle, Clock, FileText 
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../services/api';
import Papa from 'papaparse';

const AuditPage = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');

  // Fetch Audit Logs
  const { data: logs, isLoading, error } = useQuery({
    queryKey: ['auditLogs'],
    queryFn: async () => {
      const { data } = await api.get('/audit');
      return data;
    }
  });

  // Clear Logs Mutation
  const clearMutation = useMutation({
    mutationFn: () => api.delete('/audit/clear'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auditLogs'] });
      toast.success('Histórico de auditoria limpo com sucesso!');
    },
    onError: (err) => {
      toast.error('Erro ao limpar histórico: ' + (err.response?.data?.error?.message || err.message));
    }
  });

  const handleClearAll = () => {
    toast((t) => (
      <div className="flex flex-col gap-3">
        <p className="font-bold text-destructive">AVISO CRÍTICO</p>
        <p className="text-sm font-medium">Tem certeza que deseja apagar permanentemente todo o histórico de auditoria? Esta ação não poderá ser revertida.</p>
        <div className="flex justify-end gap-2 mt-2">
          <button onClick={() => toast.dismiss(t.id)} className="px-3 py-1.5 text-xs font-bold bg-secondary hover:bg-secondary/80 rounded-lg transition-colors border">Cancelar</button>
          <button onClick={() => {
            toast.dismiss(t.id);
            clearMutation.mutate();
          }} className="px-3 py-1.5 text-xs font-bold bg-destructive hover:bg-destructive/90 text-white rounded-lg transition-colors shadow-sm">Sim, apagar tudo</button>
        </div>
      </div>
    ), { duration: Infinity, style: { minWidth: '350px' } });
  };

  const handleExportCSV = () => {
    if (!filteredLogs || filteredLogs.length === 0) {
      toast.error('Não existem dados de auditoria para exportar.');
      return;
    }

    const dataToExport = filteredLogs.map(log => ({
      'ID': log.id,
      'Data/Hora': new Date(log.created_at).toLocaleString('pt-PT'),
      'Utilizador': log.username,
      'Ação': log.action,
      'Entidade': log.target_type,
      'ID do Alvo': log.target_id || 'N/A',
      'Detalhes': log.details
    }));

    const csv = Papa.unparse(dataToExport, { delimiter: ';' });
    const blob = new Blob(["\ufeff" + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `auditoria_sgfs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Logs de auditoria exportados com sucesso!');
  };

  // Helper to format action badges
  const getActionBadge = (action) => {
    const base = "px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5 ";
    switch (action) {
      case 'LOGIN':
        return <span className={`${base} bg-sky-100 text-sky-700`}><Clock size={12}/> LOGIN</span>;
      case 'CREATE_USER':
      case 'CREATE_DOCENTE':
        return <span className={`${base} bg-green-100 text-green-700`}><CheckCircle size={12}/> CRIAR</span>;
      case 'UPDATE_USER':
      case 'UPDATE_DOCENTE':
      case 'UPDATE_DOCENTE_IMPORT':
      case 'SAVE_FOLHA':
        return <span className={`${base} bg-amber-100 text-amber-700`}><FileText size={12}/> EDITAR</span>;
      case 'DELETE_USER':
      case 'DELETE_DOCENTE':
      case 'CLEAR_DOCENTES':
      case 'CLEAR_AUDIT_LOGS':
        return <span className={`${base} bg-rose-100 text-rose-700`}><Trash2 size={12}/> ELIMINAR</span>;
      default:
        return <span className={`${base} bg-slate-100 text-slate-700`}><AlertCircle size={12}/> {action}</span>;
    }
  };

  // Extract unique users and actions for filters
  const uniqueUsers = Array.from(new Set(logs?.map(l => l.username) || []));
  const uniqueActions = Array.from(new Set(logs?.map(l => l.action) || []));

  // Filter logs
  const filteredLogs = logs?.filter(log => {
    const matchesSearch = 
      log.username.toLowerCase().includes(search.toLowerCase()) ||
      (log.details && log.details.toLowerCase().includes(search.toLowerCase())) ||
      log.action.toLowerCase().includes(search.toLowerCase());

    const matchesAction = actionFilter ? log.action === actionFilter : true;
    const matchesUser = userFilter ? log.username === userFilter : true;

    return matchesSearch && matchesAction && matchesUser;
  });

  // Calculate statistics
  const stats = {
    totalLogs: filteredLogs?.length || 0,
    loginsToday: filteredLogs?.filter(l => l.action === 'LOGIN' && new Date(l.created_at).toDateString() === new Date().toDateString()).length || 0,
    updates: filteredLogs?.filter(l => ['UPDATE_USER', 'UPDATE_DOCENTE', 'SAVE_FOLHA'].includes(l.action)).length || 0,
    deletions: filteredLogs?.filter(l => ['DELETE_USER', 'DELETE_DOCENTE', 'CLEAR_DOCENTES'].includes(l.action)).length || 0
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 gap-4 min-h-[400px]">
        <span className="animate-spin text-primary rounded-full h-12 w-12 border-b-2 border-primary"></span>
        <p className="text-muted-foreground font-semibold">Carregando logs de auditoria e segurança...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center bg-rose-50 border border-rose-100 rounded-3xl text-rose-700 space-y-2">
        <AlertCircle className="mx-auto text-rose-500" size={40} />
        <h3 className="text-lg font-bold">Erro ao carregar auditoria</h3>
        <p className="text-sm">{error.message || 'Houve um problema ao contactar o servidor.'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ShieldAlert className="text-primary" size={32} />
            Histórico e Auditoria
          </h1>
          <p className="text-muted-foreground">Registo de atividades de segurança e ações realizadas no SGFS</p>
        </div>

        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 w-full md:w-auto mt-4 md:mt-0">
          <button 
            onClick={handleExportCSV}
            disabled={!filteredLogs || filteredLogs.length === 0}
            className="w-full sm:w-auto justify-center bg-secondary hover:bg-secondary/80 text-foreground px-6 py-2 rounded-lg transition-all flex items-center gap-2 font-bold shadow-sm disabled:opacity-50"
          >
            <Download size={20} />
            Exportar CSV
          </button>

          <button 
            onClick={handleClearAll}
            disabled={!logs || logs.length === 0}
            className="w-full sm:w-auto justify-center bg-destructive hover:bg-destructive/90 text-white px-6 py-2 rounded-lg transition-all flex items-center gap-2 font-bold shadow-lg shadow-destructive/20 disabled:opacity-50"
          >
            <Trash2 size={20} />
            Limpar Histórico
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-card p-6 rounded-3xl border shadow-sm space-y-2">
          <p className="text-sm font-semibold text-muted-foreground">Total de Atividades</p>
          <p className="text-3xl font-black text-slate-800">{stats.totalLogs}</p>
          <div className="text-xs text-muted-foreground">Registos encontrados</div>
        </div>
        <div className="bg-card p-6 rounded-3xl border shadow-sm space-y-2">
          <p className="text-sm font-semibold text-muted-foreground">Logins Hoje</p>
          <p className="text-3xl font-black text-sky-600">{stats.loginsToday}</p>
          <div className="text-xs text-muted-foreground">Tentativas de acesso com sucesso</div>
        </div>
        <div className="bg-card p-6 rounded-3xl border shadow-sm space-y-2">
          <p className="text-sm font-semibold text-muted-foreground">Edições Realizadas</p>
          <p className="text-3xl font-black text-amber-600">{stats.updates}</p>
          <div className="text-xs text-muted-foreground">Atualizações de docentes/horas</div>
        </div>
        <div className="bg-card p-6 rounded-3xl border shadow-sm space-y-2">
          <p className="text-sm font-semibold text-muted-foreground">Remoções</p>
          <p className="text-3xl font-black text-rose-600">{stats.deletions}</p>
          <div className="text-xs text-muted-foreground">Eliminações de dados de segurança</div>
        </div>
      </div>

      {/* Filters Area */}
      <div className="bg-card p-4 rounded-3xl border shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-3 text-muted-foreground" size={18} />
          <input 
            type="text" 
            placeholder="Pesquisar por detalhe, utilizador ou ação..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-secondary/50 border-none rounded-xl py-2.5 pl-10 pr-4 outline-none focus:ring-2 focus:ring-primary/20 text-sm font-medium"
          />
        </div>

        {/* User filter */}
        <div className="relative flex items-center gap-2">
          <User className="text-muted-foreground shrink-0" size={18} />
          <select
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
            className="w-full bg-secondary/50 border-none rounded-xl py-2.5 px-3 outline-none focus:ring-2 focus:ring-primary/20 text-sm font-medium"
          >
            <option value="">Filtrar por Utilizador (Todos)</option>
            {uniqueUsers.map(u => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </div>

        {/* Action filter */}
        <div className="relative flex items-center gap-2">
          <Calendar className="text-muted-foreground shrink-0" size={18} />
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="w-full bg-secondary/50 border-none rounded-xl py-2.5 px-3 outline-none focus:ring-2 focus:ring-primary/20 text-sm font-medium"
          >
            <option value="">Filtrar por Tipo de Ação (Todos)</option>
            {uniqueActions.map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[800px]">
            <thead>
              <tr className="bg-muted/50 border-b text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <th className="p-4">Data e Hora</th>
                <th className="p-4">Utilizador</th>
                <th className="p-4">Ação</th>
                <th className="p-4">Alvo</th>
                <th className="p-4">Detalhes do Evento</th>
              </tr>
            </thead>
            <tbody className="divide-y text-sm font-medium">
              {filteredLogs && filteredLogs.length > 0 ? (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 text-xs font-mono text-muted-foreground whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString('pt-PT')}
                    </td>
                    <td className="p-4 font-bold text-slate-700">
                      {log.username}
                    </td>
                    <td className="p-4">
                      {getActionBadge(log.action)}
                    </td>
                    <td className="p-4 text-xs font-semibold text-slate-500 whitespace-nowrap">
                      {log.target_type} {log.target_id && `(ID: ${log.target_id})`}
                    </td>
                    <td className="p-4 text-slate-600 max-w-md break-words font-normal">
                      {log.details}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-muted-foreground">
                    <ShieldAlert className="mx-auto text-slate-300 mb-2" size={32} />
                    Nenhum registo de auditoria encontrado correspondente aos critérios.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AuditPage;
