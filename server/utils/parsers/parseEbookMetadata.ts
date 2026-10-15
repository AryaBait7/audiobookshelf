import parseEpubMetadata = require('./parseEpubMetadata')
import parseComicMetadata = require('./parseComicMetadata')

declare namespace parseEbookMetadata {
  interface EBookFileScanData {
    path: string
    ebookFormat: string
    /** internal image path */
    ebookCoverPath?: string
    metadata: Partial<import('../../scanner/BookScanner').BookMetadataObject>
  }
}
type EBookFileScanData = parseEbookMetadata.EBookFileScanData

/**
 * Parse metadata from ebook file
 */
async function parse(ebookFile: import('../../models/Book').EBookFileObject): Promise<EBookFileScanData> {
  if (!ebookFile) return null

  if (ebookFile.ebookFormat === 'epub') {
    return parseEpubMetadata.parse(ebookFile)
  } else if (['cbz', 'cbr'].includes(ebookFile.ebookFormat)) {
    return parseComicMetadata.parse(ebookFile)
  }
  return null
}

/**
 * Extract cover from ebook file
 */
async function extractCoverImage(ebookFileScanData: EBookFileScanData, outputCoverPath: string): Promise<boolean> {
  if (!ebookFileScanData?.ebookCoverPath) return false

  if (ebookFileScanData.ebookFormat === 'epub') {
    return parseEpubMetadata.extractCoverImage(ebookFileScanData.path, ebookFileScanData.ebookCoverPath, outputCoverPath)
  } else if (['cbz', 'cbr'].includes(ebookFileScanData.ebookFormat)) {
    return parseComicMetadata.extractCoverImage(ebookFileScanData.path, ebookFileScanData.ebookCoverPath, outputCoverPath)
  }
  return false
}

const parseEbookMetadata = { parse, extractCoverImage }
export = parseEbookMetadata
