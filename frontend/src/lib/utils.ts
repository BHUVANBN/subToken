import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 4,
    maximumFractionDigits: 6
  }).format(amount)
}

export function truncateAddress(address: string, start: number = 6, end: number = 4): string {
  if (!address) return ''
  return `${address.slice(0, start + 2)}...${address.slice(-end)}`
}

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  
  if (hours > 0) {
    return `${hours}h ${mins}m`
  }
  return `${mins}m`
}

export function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString()
}

export function isExpired(expiryTimestamp: number): boolean {
  return Date.now() > expiryTimestamp * 1000
}
