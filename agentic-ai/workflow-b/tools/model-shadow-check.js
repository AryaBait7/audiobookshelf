/**
 * Model shadow check: initialises all 25 models (Database.buildModels order) on an in-memory SQLite
 * database and, for every model that now has a .ts source, verifies that attribute access still goes
 * through Sequelize's prototype getters/setters:
 *   - a built instance has no own property named like an attribute (a TS class field would shadow it)
 *   - assigning an attribute updates dataValues; reading it returns the stored value
 * Usage (after npm run build:server): node agentic-ai/workflow-b/tools/model-shadow-check.js
 */
const fs = require('fs')
const Path = require('path')
const { Sequelize } = require('sequelize')

const root = Path.join(__dirname, '..', '..', '..')
const order = ['User', 'Session', 'ApiKey', 'Library', 'LibraryFolder', 'Book', 'Podcast', 'PodcastEpisode', 'LibraryItem', 'MediaProgress', 'Series', 'BookSeries', 'Author', 'BookAuthor', 'Collection', 'CollectionBook', 'Playlist', 'PlaylistMediaItem', 'Device', 'PlaybackSession', 'Feed', 'FeedEpisode', 'Setting', 'CustomMetadataProvider', 'MediaItemShare']

global.ServerSettings = global.ServerSettings || {}
const sequelize = new Sequelize({ dialect: 'sqlite', storage: ':memory:', logging: false })
sequelize.uppercaseFirst = (str) => (str ? `${str[0].toUpperCase()}${str.substr(1)}` : '')

;(async () => {
  for (const name of order) require(Path.join(root, 'server', 'models', name)).init(sequelize)
  await sequelize.sync()
  let checked = 0
  let failed = 0
  for (const name of order) {
    if (!fs.existsSync(Path.join(root, 'server', 'models', name + '.ts'))) continue
    const Model = require(Path.join(root, 'server', 'models', name))
    const attrs = Object.keys(Model.rawAttributes)
    const inst = Model.build({})
    const shadowed = Object.keys(inst).filter((k) => attrs.includes(k))
    const probeAttr = attrs.find((a) => Model.rawAttributes[a].type.key === 'STRING') || attrs.find((a) => a !== 'id')
    let roundTrip = true
    if (probeAttr) {
      const value = Model.rawAttributes[probeAttr].type.key === 'STRING' ? 'probe' : Model.rawAttributes[probeAttr].type.key === 'INTEGER' ? 7 : inst[probeAttr]
      inst[probeAttr] = value
      roundTrip = inst.dataValues[probeAttr] === value && inst[probeAttr] === value && inst.get(probeAttr) === value
    }
    checked++
    const ok = shadowed.length === 0 && roundTrip
    if (!ok) failed++
    console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}: ${attrs.length} attributes, shadowed=[${shadowed}], roundTrip(${probeAttr})=${roundTrip}`)
  }
  console.log(`model-shadow-check: ${checked - failed}/${checked} TS models OK`)
  await sequelize.close()
  process.exit(failed ? 1 : 0)
})().catch((e) => {
  console.error(e)
  process.exit(2)
})
