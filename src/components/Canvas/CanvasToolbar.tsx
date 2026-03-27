import { PixelPencil } from '../ui/PixelSprite'

interface CanvasToolbarProps {
  color: string
  brushSize: number
  tool: 'pen' | 'eraser'
  onColorChange: (color: string) => void
  onBrushSizeChange: (size: number) => void
  onToolChange: (tool: 'pen' | 'eraser') => void
  onUndo: () => void
  onClear: () => void
}

const PALETTE = [
  '#1a1a1a',
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#ffffff',
  '#92400e',
]

const BRUSH_SIZES = [2, 4, 6, 8]

export default function CanvasToolbar({
  color,
  brushSize,
  tool,
  onColorChange,
  onBrushSizeChange,
  onToolChange,
  onUndo,
  onClear,
}: CanvasToolbarProps) {
  return (
    <div className="flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-2 w-full flex-wrap">
      <button
        className={`pixel-btn text-[10px] !py-1.5 !px-2.5 ${tool === 'pen' ? 'pixel-btn-primary' : ''}`}
        onClick={() => onToolChange('pen')}
      >
        <span className="flex items-center gap-1">
          <PixelPencil scale={1.5} /> 画笔
        </span>
      </button>
      <button
        className={`pixel-btn text-[10px] !py-1.5 !px-2.5 ${tool === 'eraser' ? 'pixel-btn-primary' : ''}`}
        onClick={() => onToolChange('eraser')}
      >
        橡皮
      </button>

      <div className="w-[2px] h-6 bg-pixel-border/50 mx-1" />

      <div className="flex gap-[2px] flex-wrap max-w-[200px]">
        {PALETTE.map((c) => (
          <div
            key={c}
            className={`w-5 h-5 cursor-pointer transition-transform hover:scale-125 ${
              color === c ? 'ring-2 ring-pixel-yellow' : ''
            }`}
            style={{
              backgroundColor: c,
              boxShadow: 'inset -1px -1px 0 rgba(0,0,0,0.3), inset 1px 1px 0 rgba(255,255,255,0.2)',
            }}
            onClick={() => onColorChange(c)}
          />
        ))}
      </div>

      <div className="w-[2px] h-6 bg-pixel-border/50 mx-1" />

      <div className="flex items-center gap-1">
        {BRUSH_SIZES.map((size) => (
          <div
            key={size}
            className={`flex items-center justify-center w-6 h-6 cursor-pointer hover:bg-pixel-panel-light ${
              brushSize === size ? 'bg-pixel-panel-light' : ''
            }`}
            onClick={() => onBrushSizeChange(size)}
          >
            <div className="bg-white rounded-full" style={{ width: size, height: size }} />
          </div>
        ))}
      </div>

      <div className="flex gap-1 ml-auto">
        <button className="pixel-btn text-[10px] !py-1.5 !px-2.5" onClick={onUndo}>
          撤销
        </button>
        <button className="pixel-btn pixel-btn-danger text-[10px] !py-1.5 !px-2.5" onClick={onClear}>
          清屏
        </button>
      </div>
    </div>
  )
}
