/// <reference path="../../types/shared.d.ts" />
import sequelizeLib = require('sequelize')
import type { CreationOptional, FindOptions, ForeignKey, InferAttributes, InferCreationAttributes, NonAttribute, Sequelize } from 'sequelize'
import type Book = require('./Book')
import type PodcastEpisode = require('./PodcastEpisode')

const { DataTypes, Model } = sequelizeLib

class PlaylistMediaItem extends Model<InferAttributes<PlaylistMediaItem>, InferCreationAttributes<PlaylistMediaItem>> {
  // Attributes are Sequelize getters/setters on the prototype: `declare` (no emitted class field)
  declare id: CreationOptional<string>
  declare mediaItemId: string
  declare mediaItemType: string
  declare order: number | null
  declare playlistId: ForeignKey<string>
  declare createdAt: CreationOptional<Date>

  // Expanded properties

  /** only set when expanded (afterFind hook below) */
  declare mediaItem?: NonAttribute<Book | PodcastEpisode>
  /** included associations, moved to mediaItem and deleted by the afterFind hook */
  declare book?: NonAttribute<Book>
  declare podcastEpisode?: NonAttribute<PodcastEpisode>

  constructor(values?: ConstructorParameters<typeof Model<InferAttributes<PlaylistMediaItem>, InferCreationAttributes<PlaylistMediaItem>>>[0], options?: sequelizeLib.BuildOptions) {
    super(values, options)
  }

  getMediaItem(options?: FindOptions): Promise<Book | PodcastEpisode | null> {
    if (!this.mediaItemType) return Promise.resolve(null)
    // Database.connect() adds uppercaseFirst() to the Sequelize instance
    const mixinMethodName = `get${(this.sequelize as AbsShared.AbsSequelize).uppercaseFirst(this.mediaItemType)}`
    // Association mixins (getBook / getPodcastEpisode) are added at runtime by belongsTo()
    return (this as this & Record<string, (options?: FindOptions) => Promise<Book | PodcastEpisode | null>>)[mixinMethodName](options)
  }

  /**
   * Initialize model
   */
  static init(sequelize: Sequelize): void
  /**
   * Sequelize's Model.init(attributes, options) is not supported by this model (it takes the Sequelize
   * instance instead). Declared uncallable (`this: never`) only so the class still `extends Model`.
   */
  static init(this: never, attributes: never, options: never): never
  static init(sequelize: Sequelize): void {
    super.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true
        },
        mediaItemId: DataTypes.UUID,
        mediaItemType: DataTypes.STRING,
        order: DataTypes.INTEGER
      },
      {
        sequelize,
        timestamps: true,
        updatedAt: false,
        modelName: 'playlistMediaItem'
      }
    )

    const { book, podcastEpisode, playlist } = sequelize.models

    book.hasMany(PlaylistMediaItem, {
      foreignKey: 'mediaItemId',
      constraints: false,
      scope: {
        mediaItemType: 'book'
      }
    })
    PlaylistMediaItem.belongsTo(book, { foreignKey: 'mediaItemId', constraints: false })

    podcastEpisode.hasOne(PlaylistMediaItem, {
      foreignKey: 'mediaItemId',
      constraints: false,
      scope: {
        mediaItemType: 'podcastEpisode'
      }
    })
    PlaylistMediaItem.belongsTo(podcastEpisode, { foreignKey: 'mediaItemId', constraints: false })

    PlaylistMediaItem.addHook('afterFind', (findResult: PlaylistMediaItem | PlaylistMediaItem[] | null) => {
      if (!findResult) return

      if (!Array.isArray(findResult)) findResult = [findResult]

      for (const instance of findResult) {
        // dataValues also carries the included associations (not attributes)
        const dataValues = instance.dataValues as Record<string, unknown>
        if (instance.mediaItemType === 'book' && instance.book !== undefined) {
          instance.mediaItem = instance.book
          dataValues.mediaItem = dataValues.book
        } else if (instance.mediaItemType === 'podcastEpisode' && instance.podcastEpisode !== undefined) {
          instance.mediaItem = instance.podcastEpisode
          dataValues.mediaItem = dataValues.podcastEpisode
        }
        // To prevent mistakes:
        delete instance.book
        delete dataValues.book
        delete instance.podcastEpisode
        delete dataValues.podcastEpisode
      }
    })

    playlist.hasMany(PlaylistMediaItem, {
      onDelete: 'CASCADE'
    })
    PlaylistMediaItem.belongsTo(playlist)
  }
}

export = PlaylistMediaItem
