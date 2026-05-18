import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Edit2, Trash2, UserPlus, Loader2 } from 'lucide-react';
import api from '../services/api';

const DocentesPage = () => {
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();

  const { data: docentes, isLoading } = useQuery({
    queryKey: ['docentes'],
    queryFn: async () => {
      const { data } = await api.get('/docentes');
      return data;
    }
  });

  const filteredDocentes = docentes?.filter(d => 
    d.nome.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Docentes</h1>
          <p className="text-muted-foreground">Gestão unificada de professores do Curso Nocturno</p>
        </div>

        <button className="bg-primary hover:bg-primary/90 text-white px-6 py-2 rounded-lg transition-all flex items-center gap-2 font-bold shadow-lg shadow-primary/20">
          <UserPlus size={20} />
          Novo Docente
        </button>
      </div>

      <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
        <div className="p-4 border-b flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 text-muted-foreground" size={18} />
            <input 
              type="text" 
              placeholder="Pesquisar docente..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-secondary/50 border-none rounded-xl py-2 pl-10 pr-4 outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-muted/50 border-b text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <th className="p-4">Nome do Docente</th>
                <th className="p-4">Categoria</th>
                <th className="p-4 text-center">Acções</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr>
                  <td colSpan={3} className="p-12 text-center">
                    <Loader2 className="animate-spin inline-block mr-2" /> Carregando...
                  </td>
                </tr>
              ) : filteredDocentes?.length === 0 ? (
                <tr>
                  <td colSpan={3} className="p-12 text-center text-muted-foreground">
                    Nenhum docente encontrado.
                  </td>
                </tr>
              ) : filteredDocentes?.map((d) => (
                <tr key={d.id} className="hover:bg-muted/20 transition-colors">
                  <td className="p-4 font-medium">{d.nome}</td>
                  <td className="p-4 text-muted-foreground">{d.categoria || 'N/A'}</td>
                  <td className="p-4">
                    <div className="flex items-center justify-center gap-2">
                      <button className="p-2 hover:bg-primary/10 text-primary rounded-lg transition-colors">
                        <Edit2 size={16} />
                      </button>
                      <button className="p-2 hover:bg-destructive/10 text-destructive rounded-lg transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DocentesPage;
