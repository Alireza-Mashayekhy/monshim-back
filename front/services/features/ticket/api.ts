import { api } from '@/services/api/client';
import { endpoints } from '@/services/api/endpoints';
import { ApiListResponse, ApiSingleResponse } from '@/services/api/types';

import {
  CreateTicketDto,
  SendMessageDto,
  Ticket,
  TicketQueryParams,
} from './types';

/* ─────────────────────────  کاربر  ───────────────────────── */

export const createTicket = async (
  dto: CreateTicketDto,
): Promise<ApiSingleResponse<Ticket>> => {
  const { data } = await api.post<ApiSingleResponse<Ticket>>(
    endpoints.ticket.create,
    dto,
  );
  return data;
};

export const getTickets = async (
  params: TicketQueryParams,
): Promise<ApiListResponse<Ticket>> => {
  const { data } = await api.get<ApiListResponse<Ticket>>(
    endpoints.ticket.list,
    {
      params,
    },
  );
  return data;
};

export const getTicket = async (
  id: string,
): Promise<ApiSingleResponse<Ticket>> => {
  const { data } = await api.get<ApiSingleResponse<Ticket>>(
    endpoints.ticket.detail(id),
  );
  return data;
};

export const sendTicketMessage = async (
  id: string,
  dto: SendMessageDto,
): Promise<ApiSingleResponse<Ticket>> => {
  const { data } = await api.post<ApiSingleResponse<Ticket>>(
    endpoints.ticket.messages(id),
    dto,
  );
  return data;
};

export const closeTicket = async (
  id: string,
): Promise<ApiSingleResponse<Ticket>> => {
  const { data } = await api.patch<ApiSingleResponse<Ticket>>(
    endpoints.ticket.close(id),
  );
  return data;
};

/* ─────────────────────────  ادمین  ───────────────────────── */

export const getAdminTickets = async (
  params: TicketQueryParams,
): Promise<ApiListResponse<Ticket>> => {
  const { data } = await api.get<ApiListResponse<Ticket>>(
    endpoints.ticket.admin.list,
    { params },
  );
  return data;
};

export const getAdminTicket = async (
  id: string,
): Promise<ApiSingleResponse<Ticket>> => {
  const { data } = await api.get<ApiSingleResponse<Ticket>>(
    endpoints.ticket.admin.detail(id),
  );
  return data;
};

export const sendAdminTicketMessage = async (
  id: string,
  dto: SendMessageDto,
): Promise<ApiSingleResponse<Ticket>> => {
  const { data } = await api.post<ApiSingleResponse<Ticket>>(
    endpoints.ticket.admin.messages(id),
    dto,
  );
  return data;
};

export const closeAdminTicket = async (
  id: string,
): Promise<ApiSingleResponse<Ticket>> => {
  const { data } = await api.patch<ApiSingleResponse<Ticket>>(
    endpoints.ticket.admin.close(id),
  );
  return data;
};
