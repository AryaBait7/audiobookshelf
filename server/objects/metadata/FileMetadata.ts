interface FileMetadataJSON {
  filename: string | null
  ext: string | null
  path: string | null
  relPath: string | null
  size: number | null
  mtimeMs: number | null
  ctimeMs: number | null
  birthtimeMs: number | null
}

type FileMetadataKey = keyof FileMetadataJSON

/** update()/setData() accept a JSON payload or another FileMetadata (all own enumerable keys are iterated) */
type FileMetadataPayload = Partial<Record<FileMetadataKey, unknown>>

class FileMetadata {
  filename: string | null
  ext: string | null
  path: string | null
  relPath: string | null
  size: number | null
  mtimeMs: number | null
  ctimeMs: number | null
  birthtimeMs: number | null
  /** Temp flag used in scans */
  wasModified: boolean

  constructor(metadata?: FileMetadataJSON | null) {
    this.filename = null
    this.ext = null
    this.path = null
    this.relPath = null
    this.size = null
    this.mtimeMs = null
    this.ctimeMs = null
    this.birthtimeMs = null

    if (metadata) {
      this.construct(metadata)
    }

    // Temp flag used in scans
    this.wasModified = false
  }

  construct(metadata: FileMetadataJSON): void {
    this.filename = metadata.filename
    this.ext = metadata.ext
    this.path = metadata.path
    this.relPath = metadata.relPath
    this.size = metadata.size
    this.mtimeMs = metadata.mtimeMs
    this.ctimeMs = metadata.ctimeMs
    this.birthtimeMs = metadata.birthtimeMs
  }

  toJSON(): FileMetadataJSON {
    return {
      filename: this.filename,
      ext: this.ext,
      path: this.path,
      relPath: this.relPath,
      size: this.size,
      mtimeMs: this.mtimeMs,
      ctimeMs: this.ctimeMs,
      birthtimeMs: this.birthtimeMs
    }
  }

  clone(): FileMetadata {
    return new FileMetadata(this.toJSON())
  }

  get format(): string {
    if (!this.ext) return ''
    return this.ext.slice(1).toLowerCase()
  }
  get filenameNoExt(): string {
    // Only meaningful once constructed from metadata (filename/ext set)
    return (this.filename as string).replace(this.ext as string, '')
  }

  update(payload: FileMetadataPayload): boolean {
    var hasUpdates = false
    // Writable view for the generic key loop; unknown keys are skipped by the !== undefined check
    const fields = this as Record<FileMetadataKey, unknown>
    for (const key in payload) {
      const k = key as FileMetadataKey
      if (fields[k] !== undefined && fields[k] !== payload[k]) {
        fields[k] = payload[k]
        hasUpdates = true
      }
    }
    return hasUpdates
  }

  setData(payload: FileMetadataPayload): void {
    const fields = this as Record<FileMetadataKey, unknown>
    for (const key in payload) {
      const k = key as FileMetadataKey
      if (fields[k] !== undefined) {
        fields[k] = payload[k]
      }
    }
  }
}
export = FileMetadata