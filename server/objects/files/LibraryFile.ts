/// <reference path="../../../types/shared.d.ts" />
import Path = require('path')
import fileUtils = require('../../utils/fileUtils')
import globals = require('../../utils/globals')
import FileMetadata = require('../metadata/FileMetadata')

const { getFileTimestampsWithIno, filePathToPOSIX } = fileUtils

/** Constructor input: a serialized LibraryFile (toJSON output or stored JSON) */
interface LibraryFileData {
  ino: string | null
  metadata: ConstructorParameters<typeof FileMetadata>[0]
  isSupplementary?: boolean | null
  addedAt: number | null
  updatedAt: number | null
}

class LibraryFile {
  ino: string | null
  metadata: FileMetadata | null
  isSupplementary: boolean | null
  addedAt: number | null
  updatedAt: number | null

  constructor(file?: LibraryFileData | null) {
    this.ino = null
    this.metadata = null
    this.isSupplementary = null
    this.addedAt = null
    this.updatedAt = null

    if (file) {
      this.construct(file)
    }
  }

  construct(file: LibraryFileData): void {
    this.ino = file.ino
    this.metadata = new FileMetadata(file.metadata)
    this.isSupplementary = file.isSupplementary === undefined ? null : file.isSupplementary
    this.addedAt = file.addedAt
    this.updatedAt = file.updatedAt
  }

  /** Structurally an AbsShared.LibraryFileJSON, with typed metadata */
  toJSON(): LibraryFileData & { fileType: AbsShared.LibraryFileType } {
    return {
      ino: this.ino,
      // metadata is set once constructed/scanned; toJSON is only called on populated files
      metadata: (this.metadata as FileMetadata).toJSON(),
      isSupplementary: this.isSupplementary,
      addedAt: this.addedAt,
      updatedAt: this.updatedAt,
      fileType: this.fileType
    }
  }

  clone(): LibraryFile {
    return new LibraryFile(this.toJSON())
  }

  get fileType(): AbsShared.LibraryFileType {
    // Getters below are only used on populated files (metadata set)
    const metadata = this.metadata as FileMetadata
    if (globals.SupportedImageTypes.includes(metadata.format)) return 'image'
    if (globals.SupportedAudioTypes.includes(metadata.format)) return 'audio'
    if (globals.SupportedEbookTypes.includes(metadata.format)) return 'ebook'
    if (globals.TextFileTypes.includes(metadata.format)) return 'text'
    if (globals.MetadataFileTypes.includes(metadata.format)) return 'metadata'
    return 'unknown'
  }

  get isMediaFile(): boolean {
    return this.fileType === 'audio' || this.fileType === 'ebook'
  }

  get isEBookFile(): boolean {
    return this.fileType === 'ebook'
  }

  get isOPFFile(): boolean {
    return (this.metadata as FileMetadata).ext === '.opf'
  }

  async setDataFromPath(path: string, relPath: string): Promise<void> {
    // Finding (unchanged behaviour): getFileTimestampsWithIno() returns false when stat fails; the code below
    // then iterates no keys in setData(false) and sets ino to false.ino (undefined). Typed as the success shape.
    var fileTsData = (await getFileTimestampsWithIno(path)) as Exclude<Awaited<ReturnType<typeof getFileTimestampsWithIno>>, false>
    var fileMetadata = new FileMetadata()
    fileMetadata.setData(fileTsData)
    fileMetadata.filename = Path.basename(relPath)
    fileMetadata.path = filePathToPOSIX(path)
    fileMetadata.relPath = filePathToPOSIX(relPath)
    fileMetadata.ext = Path.extname(relPath)
    this.ino = fileTsData.ino
    this.metadata = fileMetadata
    this.addedAt = Date.now()
    this.updatedAt = Date.now()
  }
}
export = LibraryFile
