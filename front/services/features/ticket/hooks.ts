import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import type { ApiSingleResponse } from '@/services/api/types';

import {
  closeAdminTicket,
  closeTicket,
  createTicket,
  getAdminTicket,
  getAdminTickets,
  getTicket,
  getTickets,
  sendAdminTicketMessage,
  sendTicketMessage,
} from './api';
import {
  CreateTicketDto,
  SendMessageDto,
  Ticket,
  TicketMessage,
  TicketQueryParams,
} from './types';

export const ticketKeys = {
  all: ['tickets'] as const,
  list: (params: TicketQueryParams) => ['tickets', params] as const,
  detail: (id: string) => ['ticket', id] as const,
  adminList: (params: TicketQueryParams) => ['admin-tickets', params] as const,
  adminDetail: (id: string) => ['admin-ticket', id] as const,
};

const getErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message || fallback;

/* ─────────────────────────  کاربر  ───────────────────────── */

export const useTickets = (params: TicketQueryParams) => {
  return useQuery({
    queryKey: ticketKeys.list(params),
    queryFn: () => getTickets(params),
    staleTime: 30 * 1000,
  });
};

export const useTicket = (id: string | null, refetchInterval?: number) => {
  return useQuery({
    queryKey: ticketKeys.detail(id ?? ''),
    queryFn: () => getTicket(id!),
    enabled: !!id,
    refetchInterval,
  });
};

export const useCreateTicket = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateTicketDto) => createTicket(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.all });
      toast.success('تیکت با موفقیت ایجاد شد.');
    },
    onError: (error: any) => {
      toast.error(getErrorMessage(error, 'خطا در ایجاد تیکت'));
    },
  });
};

export const useSendTicketMessage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: SendMessageDto }) =>
      sendTicketMessage(id, dto),

    // نمایش فوری پیام کاربر قبل از پاسخ سرور
    onMutate: async ({ id, dto }) => {
      await queryClient.cancelQueries({ queryKey: ticketKeys.detail(id) });
      const previous = queryClient.getQueryData<ApiSingleResponse<Ticket>>(
        ticketKeys.detail(id),
      );

      queryClient.setQueryData<ApiSingleResponse<Ticket>>(
        ticketKeys.detail(id),
        old => {
          if (!old?.data) return old;

          const optimisticMessage: TicketMessage = {
            id: `optimistic-${Date.now()}`,
            ticketId: id,
            senderRole: 'USER',
            senderId: old.data.userId,
            message: dto.message,
            readByUser: true,
            readByAdmin: false,
            createdAt: new Date().toISOString(),
          };

          return {
            ...old,
            data: {
              ...old.data,
              lastMessage: optimisticMessage,
              messages: [...(old.data.messages ?? []), optimisticMessage],
            },
          };
        },
      );

      return { previous };
    },

    onSuccess: (response, { id }) => {
      // پاسخ ارسال، کل گفتگو را برمی‌گرداند → بدون درخواست اضافه UI را آپدیت کن
      queryClient.setQueryData(ticketKeys.detail(id), response);
      queryClient.invalidateQueries({ queryKey: ticketKeys.all });
    },

    onError: (error: any, { id }, context) => {
      if (context?.previous) {
        queryClient.setQueryData(ticketKeys.detail(id), context.previous);
      }
      toast.error(getErrorMessage(error, 'خطا در ارسال پیام'));
    },
  });
};

export const useCloseTicket = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => closeTicket(id),
    onSuccess: (response, id) => {
      queryClient.setQueryData(ticketKeys.detail(id), response);
      queryClient.invalidateQueries({ queryKey: ticketKeys.all });
      toast.success('تیکت با موفقیت بسته شد.');
    },
    onError: (error: any) => {
      toast.error(getErrorMessage(error, 'خطا در بستن تیکت'));
    },
  });
};

/* ─────────────────────────  ادمین  ───────────────────────── */

export const useAdminTickets = (params: TicketQueryParams) => {
  return useQuery({
    queryKey: ticketKeys.adminList(params),
    queryFn: () => getAdminTickets(params),
    staleTime: 30 * 1000,
  });
};

export const useAdminTicket = (id: string | null, refetchInterval?: number) => {
  return useQuery({
    queryKey: ticketKeys.adminDetail(id ?? ''),
    queryFn: () => getAdminTicket(id!),
    enabled: !!id,
    refetchInterval,
  });
};

export const useSendAdminTicketMessage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: SendMessageDto }) =>
      sendAdminTicketMessage(id, dto),

    // نمایش فوری پاسخ ادمین قبل از تأیید سرور
    onMutate: async ({ id, dto }) => {
      await queryClient.cancelQueries({ queryKey: ticketKeys.adminDetail(id) });
      const previous = queryClient.getQueryData<ApiSingleResponse<Ticket>>(
        ticketKeys.adminDetail(id),
      );

      queryClient.setQueryData<ApiSingleResponse<Ticket>>(
        ticketKeys.adminDetail(id),
        old => {
          if (!old?.data) return old;

          const optimisticMessage: TicketMessage = {
            id: `optimistic-${Date.now()}`,
            ticketId: id,
            senderRole: 'ADMIN',
            senderId: 0,
            message: dto.message,
            readByUser: false,
            readByAdmin: true,
            createdAt: new Date().toISOString(),
          };

          return {
            ...old,
            data: {
              ...old.data,
              lastMessage: optimisticMessage,
              messages: [...(old.data.messages ?? []), optimisticMessage],
            },
          };
        },
      );

      return { previous };
    },

    onSuccess: (response, { id }) => {
      queryClient.setQueryData(ticketKeys.adminDetail(id), response);
      queryClient.invalidateQueries({ queryKey: ['admin-tickets'] });
    },

    onError: (error: any, { id }, context) => {
      if (context?.previous) {
        queryClient.setQueryData(ticketKeys.adminDetail(id), context.previous);
      }
      toast.error(getErrorMessage(error, 'خطا در ارسال پاسخ'));
    },
  });
};

export const useCloseAdminTicket = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => closeAdminTicket(id),
    onSuccess: (response, id) => {
      queryClient.setQueryData(ticketKeys.adminDetail(id), response);
      queryClient.invalidateQueries({ queryKey: ['admin-tickets'] });
      toast.success('تیکت با موفقیت بسته شد.');
    },
    onError: (error: any) => {
      toast.error(getErrorMessage(error, 'خطا در بستن تیکت'));
    },
  });
};
