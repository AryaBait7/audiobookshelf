
interface ComicInfoJson {
  ComicInfo?: {
    Series?: string[]
    Number?: string[]
    Summary?: string[]
  }
}

interface ComicInfoMetadata {
  title: string | null
  series: { name: string; sequence: string | null }[]
  description: string | null
}

/**
 * TODO: Add more fields
 * @see https://anansi-project.github.io/docs/comicinfo/intro
 * 
 * `comicInfoJson` is the xml2js output of ComicInfo.xml (every element is an array of strings)
 */
const parse = (comicInfoJson: ComicInfoJson | null | undefined): ComicInfoMetadata | null => {
  if (!comicInfoJson?.ComicInfo) return null

  const ComicSeries = comicInfoJson.ComicInfo.Series?.[0]?.trim() || null
  const ComicNumber = comicInfoJson.ComicInfo.Number?.[0]?.trim() || null
  const ComicSummary = comicInfoJson.ComicInfo.Summary?.[0]?.trim() || null

  let title = null
  const series: ComicInfoMetadata['series'] = []
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
