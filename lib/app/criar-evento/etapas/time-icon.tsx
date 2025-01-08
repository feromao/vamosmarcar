import { Sun, Sunset, Moon, Coffee, Clock } from 'lucide-react'

interface TimeIconProps {
  type: string
  label: string
  onClick: () => void
  selected?: boolean
}

export function TimeIcon({ type, label, onClick, selected }: TimeIconProps) {
  const getIcon = () => {
    switch (type) {
      case 'morning':
        return <Sun className="w-8 h-8" />
      case 'afternoon':
        return <Sunset className="w-8 h-8" />
      case 'night':
        return <Moon className="w-8 h-8" />
      case 'latenight':
        return <Coffee className="w-8 h-8" />
      case 'allday':
        return <Clock className="w-8 h-8" />
      default:
        return <Clock className="w-8 h-8" />
    }
  }

  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 border-black hover:bg-gray-50 ${
        selected ? 'bg-[#FFD700]' : 'bg-white'
      }`}
    >
      {getIcon()}
      <span className="text-sm">{label}</span>
    </button>
  )
}

