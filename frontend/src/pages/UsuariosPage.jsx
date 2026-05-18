import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { UserPlus, Shield, User, Loader2, Edit2, Trash2 } from 'lucide-react';
import api from '../services/api';

const UsuariosPage = () => {
  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data } = await api.get('/users');
      return data;
    }
  });

  const getRoleBadge = (role) => {
    const isMain = role === 'ADMIN';
    return (
      <span className={cn(
        "px-3 py-1 rounded-full text-xs font-bold",
        isMain ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"
      )}>
        {role?.replace('_', ' ')}
      </span>
    );
  };

  function cn(...inputs) {
    return inputs.filter(Boolean).join(' ');
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Utilizadores</h1>
          <p className="text-muted-foreground">Gerir Directores de Curso e Administradores</p>
        </div>

        <button className="bg-primary hover:bg-primary/90 text-white px-6 py-2 rounded-lg transition-all flex items-center gap-2 font-bold shadow-lg shadow-primary/20">
          <UserPlus size={20} />
          Criar Utilizador
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full flex justify-center p-20">
            <Loader2 className="animate-spin text-primary" size={40} />
          </div>
        ) : users?.map((u) => (
          <div key={u.id} className="bg-card p-6 rounded-3xl border shadow-sm space-y-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 bg-secondary rounded-2xl flex items-center justify-center text-primary">
                {u.role === 'ADMIN' ? <Shield size={24} /> : <User size={24} />}
              </div>
              {getRoleBadge(u.role)}
            </div>
            
            <div>
              <h3 className="font-bold text-lg">{u.username}</h3>
              <p className="text-sm text-muted-foreground">
                {u.curso_id ? `Vinculado ao Curso ID: ${u.curso_id}` : 'Sem curso específico'}
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button className="flex-1 py-2 rounded-xl border font-bold text-sm hover:bg-secondary transition-colors">
                Editar
              </button>
              <button className="p-2 rounded-xl border text-destructive hover:bg-destructive/10 transition-colors">
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UsuariosPage;
