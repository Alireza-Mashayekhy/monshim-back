export interface SiteSettings {
  id: string;
  depositPercent: number;
  commissionPercent: number;
  commissionBase?: 'total' | 'deposit';
  createdAt: string;
  updatedAt: string;
}

export interface PublicSiteSettings {
  depositPercent: number;
  commissionPercent: number;
  commissionBase: 'total' | 'deposit';
}
