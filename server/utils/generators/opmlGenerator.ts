import xml = require('../../libs/xml')
import escapeForXML = require('../../libs/xml/escapeForXML')
/** The Podcast model fields read here (models/Podcast is still JS and its fields are not visible to TS) */
interface OpmlPodcast {
  title: string | null
  feedURL: string | null
  description: string | null
  itunesPageUrl: string | null
  language: string | null
}

/**
 * Generate OPML file string for podcasts in a library
 */
const generate = (podcasts: OpmlPodcast[], indent = true): string => {
  const bodyItems: { outline: { _attr: Record<string, string> } }[] = []
  podcasts.forEach((podcast) => {
    if (!podcast.feedURL) return
    const feedAttributes: Record<string, string> = {
      type: 'rss',
      text: escapeForXML(podcast.title),
      title: escapeForXML(podcast.title),
      xmlUrl: escapeForXML(podcast.feedURL)
    }
    if (podcast.description) {
      feedAttributes.description = escapeForXML(podcast.description)
    }
    if (podcast.itunesPageUrl) {
      feedAttributes.htmlUrl = escapeForXML(podcast.itunesPageUrl)
    }
    if (podcast.language) {
      feedAttributes.language = escapeForXML(podcast.language)
    }
    bodyItems.push({
      outline: {
        _attr: feedAttributes
      }
    })
  })

  const data = [
    {
      opml: [
        {
          _attr: {
            version: '1.0'
          }
        },
        {
          head: [
            {
              title: 'Audiobookshelf Podcast Subscriptions'
            }
          ]
        },
        {
          body: bodyItems
        }
      ]
    }
  ]

  return '<?xml version="1.0" encoding="UTF-8"?>\n' + xml(data, indent)
}

export = { generate }
