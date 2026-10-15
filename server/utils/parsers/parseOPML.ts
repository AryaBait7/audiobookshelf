import h = require('htmlparser2')
import Logger = require('../../Logger')

function parse(opmlText: string): { title: string; feedUrl: string }[] {
  var feeds: { title: string; feedUrl: string }[] = []
  var parser = new h.Parser({
    onopentag: (name: string, attribs: Record<string, string>) => {
      if (name === 'outline' && attribs.type === 'rss') {
        if (!attribs.xmlurl) {
          Logger.error('[parseOPML] Invalid opml outline tag has no xmlurl attribute')
        } else {
          feeds.push({
            title: attribs.title || attribs.text || '',
            feedUrl: attribs.xmlurl
          })
        }
      }
    }
  })
  parser.write(opmlText)
  return feeds
}

export = { parse }
