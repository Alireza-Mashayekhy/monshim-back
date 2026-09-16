// types/service.types.ts
export interface Service {
  id: string;
  name: string;
  price: number;
  durationMinutes: number;
  isActive: boolean;
  barberId: number;
  createdAt: string;
  updatedAt: string;
  depositPrice: number;
}

export interface CreateServiceDto {
  name: string;
  price: number;
  durationMinutes: number;
  isActive?: boolean;
  depositPrice?: number | null;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface UpdateServiceDto extends Partial<CreateServiceDto> {}
