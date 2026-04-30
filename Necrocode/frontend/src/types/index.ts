export type Page = 'home' | 'catalog' | 'topup' | 'withdraw' | 'sell' | 'help' | 'about' | 'login' | 'register' | 'profile' | 'cart' | 'listing' | 'settings' | 'chat'
export type DeliveryMode = 'auto' | 'manual'

export type User = {
  id: number
  publicId?: string
  login: string
  email?: string
  displayName?: string
  avatarDataUrl?: string
  birthDate?: string
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
  category: string 
  techStack: string
  revenue?: string
  expenses?: string
  monetizationType?: string
  deliveryMode: DeliveryMode
  projectUrl?: string
  codeFileName?: string
  codeFileSizeBytes?: number
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
