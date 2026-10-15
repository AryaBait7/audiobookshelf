import sequelizeLib = require('sequelize')
import type { CreationOptional, ForeignKey, InferAttributes, InferCreationAttributes, Sequelize } from 'sequelize'

const { DataTypes, Model } = sequelizeLib

class LibraryFolder extends Model<InferAttributes<LibraryFolder>, InferCreationAttributes<LibraryFolder>> {
  // Attributes are Sequelize getters/setters on the prototype: `declare` (no emitted class field)
  declare id: CreationOptional<string>
  declare path: string | null
  /** Added by the library association (LibraryFolder.belongsTo(library)) */
  declare libraryId: ForeignKey<string>
  declare createdAt: CreationOptional<Date>
  declare updatedAt: CreationOptional<Date>

  constructor(values?: ConstructorParameters<typeof Model<InferAttributes<LibraryFolder>, InferCreationAttributes<LibraryFolder>>>[0], options?: sequelizeLib.BuildOptions) {
    super(values, options)
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
        path: DataTypes.STRING
      },
      {
        sequelize,
        modelName: 'libraryFolder'
      }
    )

    const { library } = sequelize.models
    library.hasMany(LibraryFolder, {
      onDelete: 'CASCADE'
    })
    LibraryFolder.belongsTo(library)
  }

  /**
   * TODO: Update to use new model
   */
  toOldJSON(): { id: string; fullPath: string | null; libraryId: string; addedAt: number } {
    return {
      id: this.id,
      fullPath: this.path,
      libraryId: this.libraryId,
      addedAt: this.createdAt.valueOf()
    }
  }
}

export = LibraryFolder
