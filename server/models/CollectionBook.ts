import sequelizeLib = require('sequelize')
import type { CreationOptional, ForeignKey, InferAttributes, InferCreationAttributes, Sequelize } from 'sequelize'

const { DataTypes, Model } = sequelizeLib

class CollectionBook extends Model<InferAttributes<CollectionBook>, InferCreationAttributes<CollectionBook>> {
  // Attributes are Sequelize getters/setters on the prototype: `declare` (no emitted class field)
  declare id: CreationOptional<string>
  declare order: number | null
  declare bookId: ForeignKey<string>
  declare collectionId: ForeignKey<string>
  declare createdAt: CreationOptional<Date>

  constructor(values?: ConstructorParameters<typeof Model<InferAttributes<CollectionBook>, InferCreationAttributes<CollectionBook>>>[0], options?: sequelizeLib.BuildOptions) {
    super(values, options)
  }

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
        order: DataTypes.INTEGER
      },
      {
        sequelize,
        timestamps: true,
        updatedAt: false,
        modelName: 'collectionBook'
      }
    )

    // Super Many-to-Many
    // ref: https://sequelize.org/docs/v6/advanced-association-concepts/advanced-many-to-many/#the-best-of-both-worlds-the-super-many-to-many-relationship
    const { book, collection } = sequelize.models
    book.belongsToMany(collection, { through: CollectionBook })
    collection.belongsToMany(book, { through: CollectionBook })

    book.hasMany(CollectionBook, {
      onDelete: 'CASCADE'
    })
    CollectionBook.belongsTo(book)

    collection.hasMany(CollectionBook, {
      onDelete: 'CASCADE'
    })
    CollectionBook.belongsTo(collection)
  }
}

export = CollectionBook
