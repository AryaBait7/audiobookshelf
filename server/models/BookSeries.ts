import sequelizeLib = require('sequelize')
import type { CreationOptional, ForeignKey, InferAttributes, InferCreationAttributes, Sequelize, WhereOptions } from 'sequelize'

const { DataTypes, Model } = sequelizeLib

class BookSeries extends Model<InferAttributes<BookSeries>, InferCreationAttributes<BookSeries>> {
  // Attributes are Sequelize getters/setters on the prototype: `declare` (no emitted class field)
  declare id: CreationOptional<string>
  declare sequence: string | null
  declare bookId: ForeignKey<string>
  declare seriesId: ForeignKey<string>
  declare createdAt: CreationOptional<Date>

  constructor(values?: ConstructorParameters<typeof Model<InferAttributes<BookSeries>, InferCreationAttributes<BookSeries>>>[0], options?: sequelizeLib.BuildOptions) {
    super(values, options)
  }

  static removeByIds(seriesId: string | null = null, bookId: string | null = null): Promise<number> {
    const where: WhereOptions<InferAttributes<BookSeries>> & { seriesId?: string; bookId?: string } = {}
    if (seriesId) where.seriesId = seriesId
    if (bookId) where.bookId = bookId
    return this.destroy({
      where
    })
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
        sequence: DataTypes.STRING
      },
      {
        sequelize,
        modelName: 'bookSeries',
        timestamps: true,
        updatedAt: false,
        indexes: [
          {
            name: 'bookSeries_seriesId',
            fields: ['seriesId']
          },
          {
            name: 'book_series_series_book',
            fields: ['seriesId', 'bookId']
          }
        ]
      }
    )

    // Super Many-to-Many
    // ref: https://sequelize.org/docs/v6/advanced-association-concepts/advanced-many-to-many/#the-best-of-both-worlds-the-super-many-to-many-relationship
    const { book, series } = sequelize.models
    book.belongsToMany(series, { through: BookSeries })
    series.belongsToMany(book, { through: BookSeries })

    book.hasMany(BookSeries, {
      onDelete: 'CASCADE'
    })
    BookSeries.belongsTo(book)

    series.hasMany(BookSeries, {
      onDelete: 'CASCADE'
    })
    BookSeries.belongsTo(series)
  }
}

export = BookSeries
