import constants = require('../../utils/constants')
import AudioMetaTags = require('../metadata/AudioMetaTags')
import FileMetadata = require('../metadata/FileMetadata')
import type LibraryFile = require('./LibraryFile')
import type MediaProbeData = require('../../scanner/MediaProbeData')

const { AudioMimeType } = constants

type AudioFileChapter = MediaProbeData.ProbeChapter
type FileMetadataJSON = NonNullable<ConstructorParameters<typeof FileMetadata>[0]>

/** Serialized AudioFile (toJSON output / stored JSON); cdNumFromFilename is a legacy name for discNumFromFilename */
interface AudioFileData {
  index: number | null
  ino: string | null
  metadata?: ConstructorParameters<typeof FileMetadata>[0]
  addedAt: number | null
  updatedAt: number | null
  trackNumFromMeta: number | null
  discNumFromMeta: number | null
  trackNumFromFilename: number | null
  discNumFromFilename: number | null
  /** Legacy name of discNumFromFilename (TEMP support in construct()) */
  cdNumFromFilename?: number | null
  manuallyVerified?: boolean
  exclude?: boolean
  error?: string | null
  format: string | null
  duration: number | null
  bitRate: number | null
  language: string | null
  codec: string | null
  timeBase: string | null
  channels: number | null
  channelLayout: string | null
  chapters: AudioFileChapter[]
  embeddedCoverArt: string | null
  metaTags?: ConstructorParameters<typeof AudioMetaTags>[0]
}

class AudioFile {
  index: number | null
  ino: string | null
  metadata: FileMetadata | null
  addedAt: number | null
  updatedAt: number | null
  trackNumFromMeta: number | null
  discNumFromMeta: number | null
  trackNumFromFilename: number | null
  discNumFromFilename: number | null
  format: string | null
  duration: number | null
  bitRate: number | null
  language: string | null
  codec: string | null
  timeBase: string | null
  channels: number | null
  channelLayout: string | null
  chapters: AudioFileChapter[]
  embeddedCoverArt: string | null
  /** Tags scraped from the audio file */
  metaTags: AudioMetaTags | null
  manuallyVerified: boolean
  exclude: boolean
  error: string | null

  constructor(data?: AudioFileData | null) {
    this.index = null
    this.ino = null
    this.metadata = null
    this.addedAt = null
    this.updatedAt = null

    this.trackNumFromMeta = null
    this.discNumFromMeta = null
    this.trackNumFromFilename = null
    this.discNumFromFilename = null

    this.format = null
    this.duration = null
    this.bitRate = null
    this.language = null
    this.codec = null
    this.timeBase = null
    this.channels = null
    this.channelLayout = null
    this.chapters = []
    this.embeddedCoverArt = null

    // Tags scraped from the audio file
    this.metaTags = null

    this.manuallyVerified = false
    this.exclude = false
    this.error = null

    if (data) {
      this.construct(data)
    }
  }

  toJSON() {
    return {
      index: this.index,
      ino: this.ino,
      // metadata is set once constructed/probed; toJSON is only called on populated files
      metadata: (this.metadata as FileMetadata).toJSON(),
      addedAt: this.addedAt,
      updatedAt: this.updatedAt,
      trackNumFromMeta: this.trackNumFromMeta,
      discNumFromMeta: this.discNumFromMeta,
      trackNumFromFilename: this.trackNumFromFilename,
      discNumFromFilename: this.discNumFromFilename,
      manuallyVerified: !!this.manuallyVerified,
      exclude: !!this.exclude,
      error: this.error || null,
      format: this.format,
      duration: this.duration,
      bitRate: this.bitRate,
      language: this.language,
      codec: this.codec,
      timeBase: this.timeBase,
      channels: this.channels,
      channelLayout: this.channelLayout,
      chapters: this.chapters,
      embeddedCoverArt: this.embeddedCoverArt,
      metaTags: this.metaTags?.toJSON() || {},
      mimeType: this.mimeType
    }
  }

  construct(data: AudioFileData): void {
    this.index = data.index
    this.ino = data.ino
    // Data without metadata yields a FileMetadata whose fields are undefined, as before
    this.metadata = new FileMetadata(data.metadata || ({} as FileMetadataJSON))
    this.addedAt = data.addedAt
    this.updatedAt = data.updatedAt
    this.manuallyVerified = !!data.manuallyVerified
    this.exclude = !!data.exclude
    this.error = data.error || null

    this.trackNumFromMeta = data.trackNumFromMeta
    this.discNumFromMeta = data.discNumFromMeta
    this.trackNumFromFilename = data.trackNumFromFilename

    if (data.cdNumFromFilename !== undefined) this.discNumFromFilename = data.cdNumFromFilename // TEMP:Support old var name
    else this.discNumFromFilename = data.discNumFromFilename

    this.format = data.format
    this.duration = data.duration
    this.bitRate = data.bitRate
    this.language = data.language
    this.codec = data.codec || null
    this.timeBase = data.timeBase
    this.channels = data.channels
    this.channelLayout = data.channelLayout
    this.chapters = data.chapters
    this.embeddedCoverArt = data.embeddedCoverArt || null

    this.metaTags = new AudioMetaTags(data.metaTags || {})
  }

  get mimeType(): string {
    const format = (this.metadata as FileMetadata).format.toUpperCase() as keyof typeof AudioMimeType
    // format is any upper-cased extension; only known ones are in AudioMimeType
    if (AudioMimeType[format]) {
      return AudioMimeType[format]
    } else {
      return AudioMimeType.MP3
    }
  }

  // New scanner creates AudioFile from AudioFileScanner
  setDataFromProbe(libraryFile: LibraryFile, probeData: MediaProbeData): void {
    this.ino = libraryFile.ino || null

    if (libraryFile.metadata instanceof FileMetadata) {
      this.metadata = libraryFile.metadata.clone()
    } else {
      this.metadata = new FileMetadata(libraryFile.metadata)
    }

    this.addedAt = Date.now()
    this.updatedAt = Date.now()

    this.format = probeData.format
    this.duration = probeData.duration
    this.bitRate = probeData.bitRate || null
    this.language = probeData.language
    this.codec = probeData.codec || null
    this.timeBase = probeData.timeBase
    this.channels = probeData.channels
    this.channelLayout = probeData.channelLayout
    this.chapters = probeData.chapters || []
    this.metaTags = probeData.audioMetaTags
    this.embeddedCoverArt = probeData.embeddedCoverArt
  }

  syncChapters(updatedChapters: AudioFileChapter[]): boolean {
    if (this.chapters.length !== updatedChapters.length) {
      this.chapters = updatedChapters.map(ch => ({ ...ch }))
      return true
    } else if (updatedChapters.length === 0) {
      if (this.chapters.length > 0) {
        this.chapters = []
        return true
      }
      return false
    }

    let hasUpdates = false
    for (let i = 0; i < updatedChapters.length; i++) {
      if (JSON.stringify(updatedChapters[i]) !== JSON.stringify(this.chapters[i])) {
        hasUpdates = true
      }
    }
    if (hasUpdates) {
      this.chapters = updatedChapters.map(ch => ({ ...ch }))
    }
    return hasUpdates
  }

  clone(): AudioFile {
    return new AudioFile(this.toJSON())
  }

  /**
   * @returns true if updates were made
   */
  updateFromScan(scannedAudioFile: AudioFile): boolean {
    let hasUpdated = false

    const newjson = scannedAudioFile.toJSON()
    const ignoreKeys = ['manuallyVerified', 'ctimeMs', 'addedAt', 'updatedAt']
    // Writable view for the generic key loop (keys of toJSON(); all are members of AudioFile)
    const fields = this as Record<AudioFileJSONKey, unknown>

    for (const key in newjson) {
      const k = key as AudioFileJSONKey
      if (k === 'metadata') {
        if ((this.metadata as FileMetadata).update(newjson[k])) {
          hasUpdated = true
        }
      } else if (key === 'metaTags') {
        if (!this.metaTags || !this.metaTags.isEqual(scannedAudioFile.metaTags)) {
          // isEqual() returned false, so scannedAudioFile.metaTags is set
          this.metaTags = (scannedAudioFile.metaTags as AudioMetaTags).clone()
          hasUpdated = true
        }
      } else if (key === 'chapters') {
        if (this.syncChapters(newjson.chapters || [])) {
          hasUpdated = true
        }
      } else if (!ignoreKeys.includes(key) && fields[k] !== newjson[k]) {
        fields[k] = newjson[k]
        hasUpdated = true
      }
    }
    return hasUpdated
  }
}
type AudioFileJSONKey = keyof ReturnType<AudioFile['toJSON']>

export = AudioFile