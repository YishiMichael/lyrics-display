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
    return index >= 0 ? this.lines.at(index)?.text : undefined
  }

  getSpan(time: number) {
    const getTimeByIndex = (index: number) => (
      index < 0 ? undefined :
      index < this.lines.length ? this.lines[index].time :
      index === this.lines.length ? this.duration :
      undefined
    )
    const validateIndex = (index: number) => {
      const startTime = getTimeByIndex(index)
      const stopTime = getTimeByIndex(index + 1)
      return (startTime === undefined || startTime <= time) && (stopTime === undefined || time < stopTime) ? {
        index,
        startTime: startTime === undefined ? (this.lines.at(0)?.time ?? this.duration) : startTime,
        stopTime: stopTime === undefined ? this.duration : stopTime,
      } : undefined
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
      startTime: this.lines.at(0)?.time ?? this.duration,
      stopTime: this.duration,
    }
  }

  getMeta(key: string) {
    return this.meta.get(key)
  }

  getLyricsJoined(separator: string = '\n') {
    return this.lines.map((line) => line.text).join(separator)
  }

  // async detectLanguage() {
  //   return (await chrome.i18n.detectLanguage(this.lines.map((line) => line.text).join('\n'))).languages.at(0)?.language
  // }
}
