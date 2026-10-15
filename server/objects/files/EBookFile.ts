import FileMetadata = require('../metadata/FileMetadata')
import type LibraryFile = require('./LibraryFile')

interface EBookFileJSON {
  ino: string | null
  metadata: ConstructorParameters<typeof FileMetadata>[0]
  ebookFormat: string | null
  addedAt: number | null
  updatedAt: number | null
}

class EBookFile {
  ino: string | null
  metadata: FileMetadata | null
  ebookFormat: string | null
  addedAt: number | null
  updatedAt: number | null

  constructor(file?: EBookFileJSON | null) {
    this.ino = null
    this.metadata = null
    this.ebookFormat = null
    this.addedAt = null
    this.updatedAt = null

    if (file) {
      this.construct(file)
    }
  }

  construct(file: EBookFileJSON): void {
    this.ino = file.ino
    this.metadata = new FileMetadata(file.metadata)
    this.ebookFormat = file.ebookFormat || this.metadata.format
    this.addedAt = file.addedAt
    this.updatedAt = file.updatedAt
  }

  toJSON() {
    return {
      ino: this.ino,
      // metadata is set by construct()/setData(); toJSON is only called on populated files
      metadata: (this.metadata as FileMetadata).toJSON(),
      ebookFormat: this.ebookFormat,
      addedAt: this.addedAt,
      updatedAt: this.updatedAt
    }
  }

  get isEpub(): boolean {
    return this.ebookFormat === 'epub'
  }

  setData(libraryFile: LibraryFile & { metadata: FileMetadata }): void {
    this.ino = libraryFile.ino
    this.metadata = libraryFile.metadata.clone()
    this.ebookFormat = libraryFile.metadata.format
    this.addedAt = Date.now()
    this.updatedAt = Date.now()
  }

  updateFromLibraryFile(libraryFile: LibraryFile & { metadata: FileMetadata }): boolean {
    var hasUpdated = false

    // Only called on populated files (metadata set)
    if ((this.metadata as FileMetadata).update(libraryFile.metadata)) {
      hasUpdated = true
    }

    if (this.ebookFormat !== libraryFile.metadata.format) {
      this.ebookFormat = libraryFile.metadata.format
      hasUpdated = true
    }

    return hasUpdated
  }
}
export = EBookFile