import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import api from '../services/api';

export const useUsuarios = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'DIRETOR_CURSO',
    curso_id: 2
  });

  // Fetch Users Query
  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data } = await api.get('/users');
      return data;
    }
  });

  // Create User Mutation
  const createMutation = useMutation({
    mutationFn: (newUser) => api.post('/users', newUser),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      closeModal();
      toast.success('Utilizador criado com sucesso!');
    },
    onError: (err) => {
      toast.error('Erro ao criar utilizador: ' + (err.response?.data?.error?.message || err.message));
    }
  });

  // Update User Mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.put(`/users/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      closeModal();
      toast.success('Utilizador atualizado com sucesso!');
    },
    onError: (err) => {
      toast.error('Erro ao atualizar utilizador: ' + (err.response?.data?.error?.message || err.message));
    }
  });

  // Delete User Mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Utilizador removido com sucesso!');
    },
    onError: (err) => {
      toast.error('Erro ao remover utilizador: ' + (err.response?.data?.error?.message || err.message));
    }
  });

  const openModal = (user = null) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        username: user.username,
        password: '', // leave empty when editing unless changing password
        role: user.role,
        curso_id: user.curso_id || 2
      });
    } else {
      setEditingUser(null);
      setFormData({
        username: '',
        password: '',
        role: 'DIRETOR_CURSO',
        curso_id: 2
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.username.trim()) {
      toast.error('Por favor introduza o nome de utilizador.');
      return;
    }

    if (!editingUser && !formData.password) {
      toast.error('Por favor introduza uma palavra-passe.');
      return;
    }

    const payload = {
      username: formData.username.trim(),
      role: formData.role,
      curso_id: formData.role === 'ADMIN' ? null : parseInt(formData.curso_id)
    };
    
    // Validate role is a valid enum value
    if (!['ADMIN', 'DIRETOR_CURSO'].includes(payload.role)) {
      toast.error('Função inválida. Por favor selecione uma opção válida.');
      return;
    }

    if (formData.password) {
      payload.password = formData.password;
    }

    if (editingUser) {
      updateMutation.mutate({ id: editingUser.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDelete = (id) => {
    toast((t) => (
      <div className="flex flex-col gap-3">
        <p className="font-medium text-sm">Tem certeza que deseja remover este utilizador? Esta ação não pode ser desfeita.</p>
        <div className="flex justify-end gap-2 mt-2">
          <button 
            onClick={() => toast.dismiss(t.id)} 
            className="px-3 py-1.5 text-xs font-bold bg-secondary hover:bg-secondary/80 rounded-lg transition-colors border"
          >
            Cancelar
          </button>
          <button 
            onClick={() => {
              toast.dismiss(t.id);
              deleteMutation.mutate(id);
            }} 
            className="px-3 py-1.5 text-xs font-bold bg-destructive hover:bg-destructive/90 text-white rounded-lg transition-colors shadow-sm"
          >
            Sim, remover
          </button>
        </div>
      </div>
    ), { duration: Infinity, style: { minWidth: '300px' } });
  };

  return {
    users,
    isLoading,
    isModalOpen,
    editingUser,
    formData,
    setFormData,
    openModal,
    closeModal,
    handleSubmit,
    handleDelete,
    isPending: createMutation.isPending || updateMutation.isPending || deleteMutation.isPending
  };
};
