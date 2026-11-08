// types/wallet.types.ts
export interface WalletBalance {
  balance: number;
  currency: string;
}

export interface Transaction {
  id: string;
  amount: number;
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'INCOME' | 'REFUND';
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  description: string;
  createdAt: string;
}

export interface BankCard {
  id: string;
  bankName: string;
  cardNumber: string; // ۱۶ رقم
  shebaNumber?: string;
  ownerName: string;
  nationalCode?: string;
  isDefault?: boolean;
}

export interface CreateBankCardPayload {
  bankName: string;
  cardNumber: string;
  shebaNumber: string;
  ownerName: string;
  nationalCode?: string;
  isDefault?: boolean;
}

export interface WithdrawRequest {
  amount: number;
  cardId: string;
  description?: string;
}
