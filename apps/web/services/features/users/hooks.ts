import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { getApiErrorMessage } from '@/lib/api-error';

import { deleteUser, editUser, usersList } from './api';

export const useUsersList = (query: { page: number; search: string }) => {
  return useQuery({
    queryKey: ['users', { ...query }],
    queryFn: () => usersList(query),
  });
};

export const useDeleteUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('کاربر با موفقیت حذف شد.');
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'حذف کاربر ناموفق بود.'));
    },
  });
};

export const useEditUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: editUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });
};
