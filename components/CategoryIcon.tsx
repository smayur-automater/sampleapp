'use client'
import type { FC, SVGProps } from 'react'
import {
  HeartIcon, BeakerIcon, SparklesIcon, AcademicCapIcon, BookOpenIcon,
  TrophyIcon, MapPinIcon, PaperAirplaneIcon, TruckIcon, ShoppingBagIcon,
  CakeIcon, MusicalNoteIcon, PaintBrushIcon, PuzzlePieceIcon, FilmIcon,
  DevicePhoneMobileIcon, GiftIcon, BriefcaseIcon, TagIcon, HomeIcon,
  SunIcon, MoonIcon, BoltIcon, FireIcon, StarIcon, CameraIcon,
  ScissorsIcon, WrenchIcon, TicketIcon, GlobeAltIcon, BanknotesIcon,
  UserGroupIcon, BuildingLibraryIcon, RocketLaunchIcon, WalletIcon,
} from '@heroicons/react/24/outline'

type HeroIcon = FC<SVGProps<SVGSVGElement> & { title?: string; titleId?: string }>

const ICONS: Record<string, HeroIcon> = {
  'heart':        HeartIcon,
  'beaker':       BeakerIcon,
  'sparkles':     SparklesIcon,
  'academic-cap': AcademicCapIcon,
  'book-open':    BookOpenIcon,
  'trophy':       TrophyIcon,
  'map-pin':      MapPinIcon,
  'plane':        PaperAirplaneIcon,
  'truck':        TruckIcon,
  'shopping-bag': ShoppingBagIcon,
  'cake':         CakeIcon,
  'music':        MusicalNoteIcon,
  'paint-brush':  PaintBrushIcon,
  'puzzle':       PuzzlePieceIcon,
  'film':         FilmIcon,
  'phone':        DevicePhoneMobileIcon,
  'gift':         GiftIcon,
  'briefcase':    BriefcaseIcon,
  'tag':          TagIcon,
  'home':         HomeIcon,
  'sun':          SunIcon,
  'moon':         MoonIcon,
  'bolt':         BoltIcon,
  'fire':         FireIcon,
  'star':         StarIcon,
  'camera':       CameraIcon,
  'scissors':     ScissorsIcon,
  'wrench':       WrenchIcon,
  'ticket':       TicketIcon,
  'globe':        GlobeAltIcon,
  'banknotes':    BanknotesIcon,
  'users':        UserGroupIcon,
  'library':      BuildingLibraryIcon,
  'rocket':       RocketLaunchIcon,
  'wallet':       WalletIcon,
}

export const ICON_OPTIONS: { name: string; label: string }[] = [
  { name: 'heart',        label: 'Medical'       },
  { name: 'beaker',       label: 'Health'        },
  { name: 'sparkles',     label: 'Dental'        },
  { name: 'academic-cap', label: 'School'        },
  { name: 'book-open',    label: 'Books'         },
  { name: 'trophy',       label: 'Sports'        },
  { name: 'map-pin',      label: 'Excursions'    },
  { name: 'plane',        label: 'Travel'        },
  { name: 'truck',        label: 'Transport'     },
  { name: 'shopping-bag', label: 'Shopping'      },
  { name: 'cake',         label: 'Food'          },
  { name: 'music',        label: 'Music'         },
  { name: 'paint-brush',  label: 'Art'           },
  { name: 'puzzle',       label: 'Activities'    },
  { name: 'film',         label: 'Entertainment' },
  { name: 'phone',        label: 'Phone'         },
  { name: 'gift',         label: 'Gifts'         },
  { name: 'ticket',       label: 'Events'        },
  { name: 'camera',       label: 'Photos'        },
  { name: 'scissors',     label: 'Haircut'       },
  { name: 'home',         label: 'Home'          },
  { name: 'globe',        label: 'Holidays'      },
  { name: 'rocket',       label: 'Hobbies'       },
  { name: 'star',         label: 'Special'       },
  { name: 'fire',         label: 'Urgent'        },
  { name: 'bolt',         label: 'Utilities'     },
  { name: 'wallet',       label: 'Allowance'     },
  { name: 'banknotes',    label: 'Cash'          },
  { name: 'users',        label: 'Childcare'     },
  { name: 'library',      label: 'Tutoring'      },
  { name: 'wrench',       label: 'Equipment'     },
  { name: 'briefcase',    label: 'Other'         },
  { name: 'tag',          label: 'General'       },
]

export function CategoryIcon({
  name,
  size  = 18,
  color = '#475569',
}: {
  name:   string
  size?:  number
  color?: string
}) {
  const Comp = ICONS[name] ?? TagIcon
  return (
    <Comp
      style={{ width: size, height: size, color, flexShrink: 0 }}
      strokeWidth={1.75}
    />
  )
}
