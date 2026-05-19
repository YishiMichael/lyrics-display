interface LyricsParams {
  duration?: number
  lines?: { time: number, text: string }[]
  meta?: Map<string, string>
}

export default class Lyrics {
  private duration: number
  private lines: { time: number, text: string }[]
  private meta: Map<string, string>
  private indicesRotator: number[]

  constructor(params?: LyricsParams) {
    this.duration = params?.duration ?? 0.0
    this.lines = params?.lines ?? []
    this.meta = params?.meta ?? new Map()
    this.indicesRotator = Array.from({ length: this.lines.length + 2 }).map((_, i: number) => i - 1)
  }

  getTextByIndex(index: number) {
    return this.lines[index]?.text ?? null
  }

  getSpan(time: number) {
    const getTimeByIndex = (index: number) => (
      index < 0 ? null :
      index < this.lines.length ? this.lines[index].time :
      index === this.lines.length ? this.duration :
      null
    )
    const validateIndex = (index: number) => {
      const startTime = getTimeByIndex(index)
      const stopTime = getTimeByIndex(index + 1)
      return (startTime === null || startTime <= time) && (stopTime === null || time < stopTime) ? {
        index,
        startTime: startTime === null ? (this.lines[0]?.time ?? this.duration) : startTime,
        stopTime: stopTime === null ? this.duration : stopTime,
      } : null
    }

    for (const _ of Array.from({ length: this.indicesRotator.length })) {
      const index = this.indicesRotator[0]
      const span = validateIndex(index)
      if (span) {
        return span
      }
      this.indicesRotator.shift()!
      this.indicesRotator.push(index)
    }
    return {
      index: 0,
      startTime: this.lines[0]?.time ?? this.duration,
      stopTime: this.duration,
    }
  }

  getMeta(key: string) {
    return this.meta.get(key)
  }

  async detectLanguage() {
    return (await chrome.i18n.detectLanguage(this.lines.map((line) => line.text).join('\n'))).languages[0]?.language ?? null
  }
}
