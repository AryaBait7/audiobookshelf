// ssrf-req-filter@1.1.0 ships no types. Declared from its lib/index.js:
//   module.exports = (url) => manageConnection(url)   // http.Agent or https.Agent (by URL scheme) with an SSRF guard
//   module.exports.requestFilterHandler = (agent) => requestFilterHandler(agent)
declare module 'ssrf-req-filter' {
  import type { Agent as HttpAgent } from 'http'
  import type { Agent as HttpsAgent } from 'https'

  function ssrfFilter(url: string): HttpAgent | HttpsAgent
  namespace ssrfFilter {
    function requestFilterHandler<T extends HttpAgent | HttpsAgent>(agent: T): T
  }
  export = ssrfFilter
}
