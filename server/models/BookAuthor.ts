import sequelizeLib = require('sequelize')
import type { CreationOptional, ForeignKey, InferAttributes, InferCreationAttributes, Sequelize, WhereOptions } from 'sequelize'

const { DataTypes, Model, fn, col } = sequelizeLib

class BookAuthor extends Model<InferAttributes<BookAuthor>, InferCreationAttributes<BookAuthor>> {
  // Attributes are Sequelize getters/setters on the prototype: `declare` (no emitted class field)
  declare id: CreationOptional<string>
  declare bookId: ForeignKey<string>
  declare authorId: ForeignKey<string>
  declare createdAt: CreationOptional<Date>

  constructor(values?: ConstructorParameters<typeof Model<InferAttributes<BookAuthor>, InferCreationAttributes<BookAuthor>>>[0], options?: sequelizeLib.BuildOptions) {
    super(values, options)
  }

  static removeByIds(authorId: string | null = null, bookId: string | null = null): Promise<number> {
    const where: WhereOptions<InferAttributes<BookAuthor>> & { authorId?: string; bookId?: string } = {}
    if (authorId) where.authorId = authorId
    if (bookId) where.bookId = bookId
    return this.destroy({
      where
    })
  }

  /**
   * Get number of books for author
   */
  static getCountForAuthor(authorId: string): Promise<number> {
    return this.count({
      where: {
        authorId
      }
    })
  }

  /**
   * Get number of books for each author
   */
  static async getCountsForAuthors(authorIds: string[]): Promise<Record<string, number>> {
    if (!authorIds.length) return {}

    // raw: true returns plain rows with only the selected columns: authorId and the COUNT alias.
    // Sequelize's findAll() type does not model `raw`; only those two fields are read below.
    const rows = (await this.findAll({
      attributes: ['authorId', [fn('COUNT', col('id')), 'count']],
      where: {
        authorId: authorIds
      },
      group: ['authorId'],
      raw: true
    })) as (BookAuthor & { count: number | string })[]

    const counts: Record<string, number> = {}
    for (const row of rows) {
      counts[row.authorId] = Number(row.count)
    }
    return counts
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
        }
      },
      {
        sequelize,
        modelName: 'bookAuthor',
        timestamps: true,
        updatedAt: false,
        indexes: [
          {
            name: 'bookAuthor_authorId',
            fields: ['authorId']
          }
        ]
      }
    )

    // Super Many-to-Many
    // ref: https://sequelize.org/docs/v6/advanced-association-concepts/advanced-many-to-many/#the-best-of-both-worlds-the-super-many-to-many-relationship
    const { book, author } = sequelize.models
    book.belongsToMany(author, { through: BookAuthor })
    author.belongsToMany(book, { through: BookAuthor })

    book.hasMany(BookAuthor, {
      onDelete: 'CASCADE'
    })
    BookAuthor.belongsTo(book)

    author.hasMany(BookAuthor, {
      onDelete: 'CASCADE'
    })
    BookAuthor.belongsTo(author)
  }
}
export = BookAuthor
