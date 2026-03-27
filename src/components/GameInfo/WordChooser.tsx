interface WordChooserProps {
  words: string[]
  timeLeft: number
  onChoose: (word: string) => void
}

export default function WordChooser({ words, timeLeft, onChoose }: WordChooserProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="pixel-panel flex flex-col items-center gap-6 p-8 max-w-md w-full">
        <h2 className="text-pixel-yellow pixel-text-shadow text-sm">选择一个词语来画</h2>

        <div className="flex items-center gap-1">
          <div className={`w-2 h-2 rounded-full animate-pulse-glow ${timeLeft <= 5 ? 'bg-pixel-red' : 'bg-pixel-green'}`} />
          <span className={`font-pixel text-lg pixel-text-shadow ${timeLeft <= 5 ? 'text-pixel-red' : 'text-pixel-green'}`}>
            {timeLeft}
          </span>
          <span className="text-pixel-tile/60 text-[10px]">s</span>
        </div>

        <div className="flex gap-3">
          {words.map((word) => (
            <button
              key={word}
              onClick={() => onChoose(word)}
              className="pixel-btn pixel-btn-primary py-4 px-6 text-sm tracking-wider hover:scale-105 transition-transform"
            >
              {word}
            </button>
          ))}
        </div>

        <p className="text-pixel-tile/40 text-[10px]">超时将随机选择</p>
      </div>
    </div>
  )
}
