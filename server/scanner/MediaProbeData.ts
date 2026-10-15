import AudioMetaTags = require('../objects/metadata/AudioMetaTags')

class MediaProbeData {
  embeddedCoverArt: string | null
  format: string | null
  duration: number | null
  size: number | null

  audioStream: MediaProbeData.ProbeAudioStream | null
  videoStream: MediaProbeData.ProbeVideoStream | null

  bitRate: number | null
  codec: string | null
  timeBase: string | null
  language: string | null
  channelLayout: string | null
  channels: number | null
  sampleRate: number | null
  chapters: MediaProbeData.ProbeChapter[]

  audioMetaTags: AudioMetaTags | null

  trackNumber: number | null
  trackTotal: number | null

  discNumber: number | null
  discTotal: number | null

  constructor(probeData?: Partial<Record<MediaProbeData.FieldKey, unknown>> | null) {
    this.embeddedCoverArt = null
    this.format = null
    this.duration = null
    this.size = null

    this.audioStream = null
    this.videoStream = null

    this.bitRate = null
    this.codec = null
    this.timeBase = null
    this.language = null
    this.channelLayout = null
    this.channels = null
    this.sampleRate = null
    this.chapters = []

    this.audioMetaTags = null

    this.trackNumber = null
    this.trackTotal = null

    this.discNumber = null
    this.discTotal = null

    if (probeData) {
      this.construct(probeData)
    }
  }

  /**
   * Copies every key of `probeData` that is also an initialised field here; audioMetaTags is re-wrapped
   */
  construct(probeData: Partial<Record<MediaProbeData.FieldKey, unknown>>): void {
    // Writable view for the generic key loop; unknown keys are skipped by the !== undefined check
    const fields = this as Record<MediaProbeData.FieldKey, unknown>
    for (const key in probeData) {
      const k = key as MediaProbeData.FieldKey
      if (key === 'audioMetaTags' && probeData[k]) {
        fields[k] = new AudioMetaTags(probeData[k] as ConstructorParameters<typeof AudioMetaTags>[0])
      } else if (fields[k] !== undefined) {
        fields[k] = probeData[k]
      }
    }
  }

  /**
   * @param data result of utils/prober.js probe() for a file with an audio stream
   */
  setData(data: MediaProbeData.ProbeResult): void {
    this.embeddedCoverArt = data.video_stream?.codec || null
    this.format = data.format
    this.duration = data.duration
    this.size = data.size

    this.audioStream = data.audio_stream
    this.videoStream = this.embeddedCoverArt ? null : data.video_stream || null

    this.bitRate = this.audioStream.bit_rate || data.bit_rate
    this.codec = this.audioStream.codec
    this.timeBase = this.audioStream.time_base
    this.language = this.audioStream.language
    this.channelLayout = this.audioStream.channel_layout
    this.channels = this.audioStream.channels
    this.sampleRate = this.audioStream.sample_rate
    this.chapters = data.chapters || []

    this.audioMetaTags = new AudioMetaTags()
    this.audioMetaTags.setData(data.tags)
  }
}

namespace MediaProbeData {
  /** Instance fields that construct() may copy */
  export type FieldKey = Exclude<keyof MediaProbeData, 'construct' | 'setData'>

  export interface ProbeChapter {
    id: number
    start: number
    end: number
    title: string
  }

  export interface ProbeAudioStream {
    bit_rate: number | null
    codec: string | null
    time_base: string | null
    language: string | null
    channel_layout: string | null
    channels: number | null
    sample_rate: number | null
  }

  export interface ProbeVideoStream {
    codec: string | null
  }

  /** Shape produced by utils/prober.js (still JS); only the fields read here */
  export interface ProbeResult {
    format: string | null
    duration: number | null
    size: number | null
    bit_rate: number | null
    audio_stream: ProbeAudioStream
    video_stream?: ProbeVideoStream | null
    chapters?: ProbeChapter[]
    tags: Record<string, string | null | undefined>
  }
}

export = MediaProbeData
