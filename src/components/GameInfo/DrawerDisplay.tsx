import { PixelCharacter, PixelToilet, PixelPencil } from '../ui/PixelSprite'

interface DrawerDisplayProps {
  name: string
  colorIndex: number
  compact?: boolean
}

export default function DrawerDisplay({ name, colorIndex, compact }: DrawerDisplayProps) {
  if (compact) {
    return (
      <span className="text-pixel-yellow text-[10px] pixel-text-shadow flex items-center gap-1">
        <PixelPencil scale={1} />
        画手: {name}
      </span>
    )
  }

  return (
    <div className="brick-wall flex items-center gap-3 py-3 px-4 border-b-4 border-pixel-border-dark">
      <div className="relative shrink-0 flex items-end">
        <div className="relative z-10" style={{ marginBottom: -16 }}>
          <PixelCharacter variant="front" colorIndex={colorIndex} scale={3} />
        </div>
        <div className="absolute bottom-0 z-0 left-1/2 -translate-x-1/2">
          <PixelToilet variant="front" scale={3} />
        </div>
      </div>
      <div className="flex flex-col items-start gap-1 min-w-0">
        <div className="flex items-center gap-1">
          <div className="animate-float">
            <PixelPencil scale={1.5} />
          </div>
          <span className="text-pixel-tile/60 text-[10px]">画手</span>
        </div>
        <span className="text-pixel-yellow text-xs pixel-text-shadow truncate max-w-[200px]">
          {name}
        </span>
      </div>
    </div>
  )
}
