import { useState, useRef, useEffect } from 'react'

export interface ChatMessage {
  player: string
  message: string
  type: 'guess' | 'correct' | 'chat'
}

interface ChatPanelProps {
  messages: ChatMessage[]
  /** 画手不能猜词，输入框禁用 */
  isDrawer?: boolean
  onSend: (message: string) => void
  className?: string
}

export default function ChatPanel({ messages, isDrawer = false, onSend, className }: ChatPanelProps) {
  const [input, setInput] = useState('')
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages.length])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const text = input.trim()
    if (!text) return
    onSend(text)
    setInput('')
  }

  return (
    <div className={`flex-1 flex flex-col bg-pixel-bg ${className ?? ''}`}>
      {/* 消息列表 */}
      <div ref={listRef} className="flex-1 overflow-y-auto p-2 space-y-1">
        {messages.map((msg, i) => (
          <div key={i} className="text-xs">
            {msg.type === 'correct' ? (
              <div className="pixel-panel-inset !p-1.5 my-1">
                <span className="text-pixel-green font-bold pixel-text-shadow">
                  {msg.player} 猜对了!
                </span>
              </div>
            ) : (
              <p className="py-0.5">
                <span className={msg.type === 'guess' ? 'text-pixel-blue' : 'text-pixel-tile/60'}>
                  {msg.player}:
                </span>{' '}
                <span className="text-pixel-tile/80">{msg.message}</span>
              </p>
            )}
          </div>
        ))}
      </div>

      {/* 输入框 */}
      <form onSubmit={handleSubmit} className="p-2 border-t-2 border-pixel-border-dark">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={isDrawer ? '画手禁止发言...' : '输入猜测...'}
          disabled={isDrawer}
          className="pixel-input w-full text-xs !py-2 disabled:opacity-50"
        />
      </form>
    </div>
  )
}
