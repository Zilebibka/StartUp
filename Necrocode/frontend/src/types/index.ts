export type Page = 'home' | 'topup' | 'withdraw' | 'sell' | 'help' | 'about' | 'login' | 'register' | 'profile' | 'cart' | 'listing'
export type DeliveryMode = 'auto' | 'manual'

export type User = {
  id: number
  login: string
  email?: string
  displayName?: string
  createdAt?: string
}

export type AuthResponse = {
  accessToken: string
  user: User
}

export type Listing = {
  id: number
  title: string
  description: string
  price: number
  ownerLogin: string
  deliveryMode: DeliveryMode
  projectUrl?: string
  codeFileName?: string
  imageDataUrls: string[]
  createdAt: string
}

export type CartItem = {
  listingId: number
  qty: number
}

export type AppNotification = {
  id: number
  message: string
  type: 'success' | 'error' | 'info'
  createdAt: string
  read: boolean
}
