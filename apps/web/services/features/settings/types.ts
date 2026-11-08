import type { CommissionMode, CommissionTier } from '@/lib/order-pricing';

export interface SiteSettings {
  id: string;
  depositPercent: number;
  commissionPercent: number;
  commissionBase?: 'total' | 'deposit';
  commissionMode?: CommissionMode;
  commissionTiers?: CommissionTier[];
  commissionMaxAmount?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface PublicSiteSettings {
  depositPercent: number;
  commissionPercent: number;
  commissionBase: 'total' | 'deposit';
  commissionMode?: CommissionMode;
  commissionTiers?: CommissionTier[];
  commissionMaxAmount?: number | null;
}
