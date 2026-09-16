import { create } from 'zustand';

import { extractUser } from '@/lib/roles';
import { UserResponse } from '@/services/features/auth/types';

type AuthStore = {
  user: UserResponse | null;
  setUser: (user: UserResponse | UserResponse[] | null) => void;
  clearUser: () => void;
};

export const useAuthStore = create<AuthStore>(set => ({
  user: null,

  setUser: user =>
    set({
      user: extractUser(user),
    }),

  clearUser: () =>
    set({
      user: null,
    }),
}));
