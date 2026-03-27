import { useRef, useEffect, useState, useCallback, useImperativeHandle, forwardRef } from 'react'

export interface DrawPoint {
  x: number
  y: number
  color: string
  size: number
  tool: 'pen' | 'eraser'
  /** true = 一笔的起点 */
  isStart?: boolean
}

export interface DrawingCanvasHandle {
  undo: () => void
  clear: () => void
  /** 保存当前画布快照（用于观众端在远程笔画开始前保存） */
  saveSnapshot: () => void
  /** 重放一组绘画点（用于观众端接收远程数据） */
  replay: (points: DrawPoint[]) => void
  /** 直接画一个点 */
  drawRemoteDot: (x: number, y: number, color: string, size: number) => void
  /** 直接画一条线段（直线） */
  drawRemoteLine: (from: { x: number; y: number }, to: { x: number; y: number }, color: string, size: number) => void
  /** 使用二次贝塞尔曲线画平滑线段（远程绘画用） */
  drawRemoteCurve: (prev: { x: number; y: number }, from: { x: number; y: number }, to: { x: number; y: number }, color: string, size: number) => void
  getImageData: () => ImageData | null
}

interface DrawingCanvasProps {
  width?: number
  height?: number
  /** 是否允许绘画（画手=true，观众=false） */
  isDrawer: boolean
  color: string
  brushSize: number
  tool: 'pen' | 'eraser'
  /** 每个绘画点的回调（用于同步给其他玩家） */
  onDraw?: (data: DrawPoint) => void
  /** 一笔结束时的回调 */
  onStrokeEnd?: () => void
}

const DrawingCanvas = forwardRef<DrawingCanvasHandle, DrawingCanvasProps>(
  function DrawingCanvas(
    {
      width = 800,
      height = 550,
      isDrawer,
      color,
      brushSize,
      tool,
      onDraw,
      onStrokeEnd,
    },
    ref,
  ) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const isDrawingNow = useRef(false)
    const lastPoint = useRef<{ x: number; y: number } | null>(null)
    /** 撤销用的快照栈 */
    const [history, setHistory] = useState<ImageData[]>([])

    // 初始化画布白色背景
    useEffect(() => {
      const ctx = canvasRef.current?.getContext('2d')
      if (!ctx) return
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, width, height)
    }, [width, height])

    const getCtx = () => canvasRef.current?.getContext('2d') ?? null

    // ---- 绘图核心 ----

    const drawSegment = useCallback(
      (from: { x: number; y: number }, to: { x: number; y: number }, drawColor: string, size: number) => {
        const ctx = getCtx()
        if (!ctx) return
        ctx.beginPath()
        ctx.moveTo(from.x, from.y)
        ctx.lineTo(to.x, to.y)
        ctx.strokeStyle = drawColor
        ctx.lineWidth = size
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.stroke()
      },
      [],
    )

    const drawDot = useCallback((point: { x: number; y: number }, drawColor: string, size: number) => {
      const ctx = getCtx()
      if (!ctx) return
      ctx.beginPath()
      ctx.arc(point.x, point.y, size / 2, 0, Math.PI * 2)
      ctx.fillStyle = drawColor
      ctx.fill()
    }, [])


    // ---- 保存/恢复快照 ----

    const saveSnapshot = useCallback(() => {
      const ctx = getCtx()
      if (!ctx) return
      const snap = ctx.getImageData(0, 0, width, height)
      setHistory((prev) => {
        const next = [...prev, snap]
        // 最多保留 30 步
        if (next.length > 30) next.shift()
        return next
      })
    }, [width, height])

    // ---- 暴露方法给父组件 ----

    useImperativeHandle(
      ref,
      () => ({
        undo() {
          setHistory((prev) => {
            if (prev.length === 0) return prev
            const next = [...prev]
            const snap = next.pop()!
            const ctx = getCtx()
            if (ctx) ctx.putImageData(snap, 0, 0)
            return next
          })
        },
        clear() {
          const ctx = getCtx()
          if (!ctx) return
          saveSnapshot()
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(0, 0, width, height)
        },
        saveSnapshot() {
          saveSnapshot()
        },
        replay(points: DrawPoint[]) {
          let prev: { x: number; y: number } | null = null
          for (const p of points) {
            const drawColor = p.tool === 'eraser' ? '#ffffff' : p.color
            if (p.isStart) {
              drawDot(p, drawColor, p.size)
              prev = { x: p.x, y: p.y }
            } else if (prev) {
              drawSegment(prev, p, drawColor, p.size)
              prev = { x: p.x, y: p.y }
            }
          }
        },
        getImageData() {
          return getCtx()?.getImageData(0, 0, width, height) ?? null
        },
        drawRemoteDot(x: number, y: number, color: string, size: number) {
          drawDot({ x, y }, color, size)
        },
        drawRemoteLine(from: { x: number; y: number }, to: { x: number; y: number }, color: string, size: number) {
          drawSegment(from, to, color, size)
        },
        drawRemoteCurve(prev: { x: number; y: number }, from: { x: number; y: number }, to: { x: number; y: number }, color: string, size: number) {
          // 使用 from 作为控制点, 从 midpoint(prev,from) 画到 midpoint(from,to)
          const ctx = getCtx()
          if (!ctx) return
          const mx0 = (prev.x + from.x) / 2
          const my0 = (prev.y + from.y) / 2
          const mx1 = (from.x + to.x) / 2
          const my1 = (from.y + to.y) / 2
          ctx.beginPath()
          ctx.moveTo(mx0, my0)
          ctx.quadraticCurveTo(from.x, from.y, mx1, my1)
          ctx.strokeStyle = color
          ctx.lineWidth = size
          ctx.lineCap = 'round'
          ctx.lineJoin = 'round'
          ctx.stroke()
        },
      }),
      [width, height, saveSnapshot, drawDot, drawSegment],
    )

    // ---- 坐标转换 ----

    const clientToCanvasPoint = (clientX: number, clientY: number) => {
      const canvas = canvasRef.current
      if (!canvas) return null
      const rect = canvas.getBoundingClientRect()
      return {
        x: ((clientX - rect.left) / rect.width) * width,
        y: ((clientY - rect.top) / rect.height) * height,
      }
    }

    const getMousePoint = (e: React.MouseEvent<HTMLCanvasElement>) =>
      clientToCanvasPoint(e.clientX, e.clientY)

    const getTouchPoint = (e: React.TouchEvent<HTMLCanvasElement>) => {
      const touch = e.touches[0] ?? e.changedTouches[0]
      return touch ? clientToCanvasPoint(touch.clientX, touch.clientY) : null
    }

    const resolveColor = () => (tool === 'eraser' ? '#ffffff' : color)

    const startStroke = (point: { x: number; y: number }) => {
      saveSnapshot()
      isDrawingNow.current = true
      lastPoint.current = point
      drawDot(point, resolveColor(), brushSize)
      onDraw?.({ x: point.x, y: point.y, color, size: brushSize, tool, isStart: true })
    }

    const continueStroke = (point: { x: number; y: number }) => {
      drawSegment(lastPoint.current!, point, resolveColor(), brushSize)
      lastPoint.current = point
      onDraw?.({ x: point.x, y: point.y, color, size: brushSize, tool })
    }

    const endStroke = () => {
      if (!isDrawingNow.current) return
      isDrawingNow.current = false
      lastPoint.current = null
      onStrokeEnd?.()
    }

    const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDrawer) return
      const point = getMousePoint(e)
      if (point) startStroke(point)
    }

    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDrawingNow.current || !lastPoint.current) return
      const point = getMousePoint(e)
      if (point) continueStroke(point)
    }

    const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
      if (!isDrawer) return
      e.preventDefault()
      const point = getTouchPoint(e)
      if (point) startStroke(point)
    }

    const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
      if (!isDrawingNow.current || !lastPoint.current) return
      e.preventDefault()
      const point = getTouchPoint(e)
      if (point) continueStroke(point)
    }

    const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
      e.preventDefault()
      endStroke()
    }

    return (
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className={`w-full h-full ${isDrawer ? 'cursor-crosshair' : 'cursor-default'}`}
        style={{ touchAction: 'none' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={endStroke}
        onMouseLeave={endStroke}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      />
    )
  },
)

export default DrawingCanvas
