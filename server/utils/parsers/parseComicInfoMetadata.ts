type BookMetadataObject = Partial<import('../../scanner/BookScanner').BookMetadataObject>

interface ComicInfoJson {
  ComicInfo?: {
    Series?: string[]
    Number?: string[]
    Summary?: string[]
  }
}

/**
 * TODO: Add more fields
 * @see https://anansi-project.github.io/docs/comicinfo/intro
 *
 * @param comicInfoJson
 */
const parse = (comicInfoJson: ComicInfoJson): BookMetadataObject | null => {
  if (!comicInfoJson?.ComicInfo) return null

  const ComicSeries = comicInfoJson.ComicInfo.Series?.[0]?.trim() || null
  const ComicNumber = comicInfoJson.ComicInfo.Number?.[0]?.trim() || null
  const ComicSummary = comicInfoJson.ComicInfo.Summary?.[0]?.trim() || null

  let title = null
  const series = []
  if (ComicSeries) {
    series.push({
      name: ComicSeries,
      sequence: ComicNumber
    })

    title = ComicSeries
    if (ComicNumber) {
      title += ` ${ComicNumber}`
    }
  }

  return {
    title,
    series,
    description: ComicSummary
  }
}

export = { parse }
