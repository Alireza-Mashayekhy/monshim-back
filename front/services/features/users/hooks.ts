import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { editUser, usersList } from './api';

export const useUsersList = (query: { page: number; search: string }) => {
  return useQuery({
    queryKey: ['users', { ...query }],
    queryFn: () => usersList(query),
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
