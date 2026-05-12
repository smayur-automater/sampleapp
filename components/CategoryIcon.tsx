'use client'
import {
  HeartPulse, GraduationCap, Dumbbell, MapPin, Plane, Sparkles,
  Shirt, Utensils, Music, Tag, Briefcase, Gift, Book, Gamepad2,
  Bus, Bike, Stethoscope, Palette, Tv, Phone, Pizza,
  type LucideIcon
} from 'lucide-react'

// Lucide icon name → component map
const ICONS: Record<string, LucideIcon> = {
  'heart-pulse': HeartPulse,
  'graduation-cap': GraduationCap,
  'dumbbell': Dumbbell,
  'map-pin': MapPin,
  'plane': Plane,
  'sparkles': Sparkles,
  'shirt': Shirt,
  'utensils': Utensils,
  'music': Music,
  'tag': Tag,
  'briefcase': Briefcase,
  'gift': Gift,
  'book': Book,
  'gamepad': Gamepad2,
  'bus': Bus,
  'bike': Bike,
  'stethoscope': Stethoscope,
  'palette': Palette,
  'tv': Tv,
  'phone': Phone,
  'pizza': Pizza,
}

// The list users can pick from when creating a category
export const ICON_OPTIONS: { name: string; label: string }[] = [
  { name: 'heart-pulse', label: 'Medical' },
  { name: 'stethoscope', label: 'Health' },
  { name: 'sparkles', label: 'Dental' },
  { name: 'graduation-cap', label: 'School' },
  { name: 'book', label: 'Books' },
  { name: 'dumbbell', label: 'Sports' },
  { name: 'bike', label: 'Cycling' },
  { name: 'map-pin', label: 'Excursions' },
  { name: 'plane', label: 'Travel' },
  { name: 'bus', label: 'Transport' },
  { name: 'shirt', label: 'Clothing' },
  { name: 'utensils', label: 'Food' },
  { name: 'pizza', label: 'Treats' },
  { name: 'music', label: 'Music' },
  { name: 'palette', label: 'Art' },
  { name: 'gamepad', label: 'Games' },
  { name: 'tv', label: 'Entertainment' },
  { name: 'phone', label: 'Phone' },
  { name: 'gift', label: 'Gifts' },
  { name: 'briefcase', label: 'Other' },
  { name: 'tag', label: 'Tag' },
]

export function CategoryIcon({ name, size = 18, color = '#475569' }: { name: string; size?: number; color?: string }) {
  const Comp = ICONS[name] ?? Tag
  return <Comp size={size} color={color} strokeWidth={1.75} />
}
