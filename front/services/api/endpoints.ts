export const endpoints = {
  auth: {
    login: '/auth/login',
    otp: '/auth/send-otp',
    verifyOtp: '/auth/verify-otp',
    registerBarber: '/auth/register-barber',
    signUp: '/auth/sign-up',
    me: '/auth/me',
    logout: '/auth/logout',
    refresh: '/auth/refresh',
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
    workHours: '/barber/profile/work-hours',
    updateWorkHours: '/barber/profile/work-hours',
    referralCode: '/barber/profile/referral-code',
    admin: {
      list: '/admin/barber',
      detail: (id: string) => `/admin/barber/${id}`,
      update: '/admin/barber',
      remove: '/admin/barber',
      review: (id: string) => `/admin/barber/${id}/review`,
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
    detail: (id: number) => `/services/${id}`,
    edit: (id: number) => `/services/${id}`,
    delete: (id: number) => `/services/${id}`,
  },

  subscription: {
    list: '/admin/subscriptions',
    active: '/admin/subscriptions/active',
    create: '/admin/subscriptions',
    detail: (id: string) => `/admin/subscriptions/${id}`,
    update: (id: string) => `/admin/subscriptions/${id}`,
    delete: (id: string) => `/admin/subscriptions/${id}`,
    toggleActive: (id: string) => `/admin/subscriptions/${id}/toggle`,
  },

  userSubscription: {
    create: '/user-subscriptions',
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
    booking: '/payment/booking',
    status: (trackId: number | string) => `/payment/status/${trackId}`,
  },
};
