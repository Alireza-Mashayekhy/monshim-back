export const endpoints = {
  auth: {
    login: '/auth/login',
    loginWithPassword: '/auth/login-with-password',
    otp: '/auth/send-otp',
    verifyOtp: '/auth/verify-otp',
    registerBarber: '/auth/register-barber',
    signUp: '/auth/sign-up',
    me: '/auth/me',
    logout: '/auth/logout',
    refresh: '/auth/refresh',
    changePassword: '/auth/change-password',
    requestChangePasswordCode: '/auth/change-password/request-code',
  },

  users: {
    list: '/users',
    detail: (id: number) => `/users/${id}`,
    edit: `/users/me`,
  },

  categories: {
    list: '/categories',
    create: '/categories',
  },

  locations: {
    provinceList: '/locations/provinces',
    searchCities: '/locations/cities',
    cityList: (id: number) => `/locations/provinces/${id}/cities`,
  },

  barber: {
    list: '/barber',
    detail: (id: number) => `/barber/${id}`,
    myPofile: '/barber/profile/me',
    updateProfile: '/barber/profile/me',
    updateProfileImage: '/barber/profile/image',
    portfolio: '/barber/profile/portfolio',
    workHours: '/barber/profile/work-hours',
    updateWorkHours: '/barber/profile/work-hours',
    referralCode: '/barber/profile/referral-code',
    reviews: (id: number | string) => `/barber/${id}/reviews`,
    myReview: (id: number | string) => `/barber/${id}/reviews/my`,
    myReviews: '/barber-reviews/my',
    admin: {
      list: '/admin/barber',
      detail: (id: string) => `/admin/barber/${id}`,
      approvalDetail: (id: string) => `/admin/barber/${id}/approval`,
      update: '/admin/barber',
      remove: '/admin/barber',
      review: (id: string) => `/admin/barber/${id}/review`,
    },
    adminReviews: {
      list: '/admin/barber-reviews',
      moderate: (id: string) => `/admin/barber-reviews/${id}`,
    },
  },

  booking: {
    create: '/bookings',
    availableTimes: '/bookings/available-slots',
    manual: '/bookings/manual',
  },

  club: {
    groups: '/club/groups',
    group: (id: string) => `/club/groups/${id}`,
    customers: '/club/customers',
    customer: (id: string) => `/club/customers/${id}`,
  },

  services: {
    list: '/services/my-services',
    create: '/services',
    detail: (id: string) => `/services/${id}`,
    edit: (id: string) => `/services/${id}`,
    delete: (id: string) => `/services/${id}`,
  },

  subscription: {
    list: '/admin/subscriptions',
    detail: (id: string) => `/admin/subscriptions/${id}`,
    update: (id: string) => `/admin/subscriptions/${id}`,
  },

  userSubscription: {
    smsUsage: '/user-subscriptions/sms-usage',
    current: '/user-subscriptions/current',
    list: '/user-subscriptions',
    detail: (id: string) => `/user-subscriptions/${id}`,
    active: '/user-subscriptions/plans',
  },

  referral: {
    myReferrals: '/referral/my-referrals',
  },

  settings: {
    get: '/admin/settings',
    update: '/admin/settings',
    public: '/settings/public',
    paymentConfig: '/settings/payment-config',
  },

  adminWithdrawals: {
    list: '/admin/withdrawals',
    approve: (id: string) => `/admin/withdrawals/${id}/approve`,
    reject: (id: string) => `/admin/withdrawals/${id}/reject`,
  },

  adminTransactions: {
    list: '/admin/transactions',
    export: '/admin/transactions/export',
    settleRefund: (id: string) => `/admin/transactions/${id}/settle-refund`,
    approveWithdrawal: (id: string) =>
      `/admin/transactions/${id}/approve-withdrawal`,
    rejectWithdrawal: (id: string) =>
      `/admin/transactions/${id}/reject-withdrawal`,
  },

  ticket: {
    create: '/ticket',
    list: '/ticket',
    detail: (id: string) => `/ticket/${id}`,
    messages: (id: string) => `/ticket/${id}/messages`,
    close: (id: string) => `/ticket/${id}/close`,
    admin: {
      list: '/admin/ticket',
      detail: (id: string) => `/admin/ticket/${id}`,
      messages: (id: string) => `/admin/ticket/${id}/messages`,
      close: (id: string) => `/admin/ticket/${id}/close`,
    },
  },

  payment: {
    subscription: '/payment/subscription',
    publicPage: '/payment/public-page',
    booking: '/payment/booking',
    depositInvoice: (token: string) =>
      `/payment/deposit/${encodeURIComponent(token)}/invoice`,
    payDeposit: (token: string) =>
      `/payment/deposit/${encodeURIComponent(token)}/pay`,
    status: (trackId: number | string) => `/payment/status/${trackId}`,
  },

  /** صفحهٔ عمومی و سئوشدهٔ آرایشگاه (`/barber/[slug]`) */
  publicPage: {
    /** فقط آرایشگرهایی که صفحه‌شان فعال است و اسلاگ ثبت کرده‌اند — مبنای sitemap */
    directory: '/public-page/directory',
    barber: (identifier: number | string) =>
      `/public-page/barber/${encodeURIComponent(String(identifier))}`,
    me: '/public-page/me',
    checkSlug: '/public-page/slug/check',
    updateSlug: '/public-page/me/slug',
  },
};
