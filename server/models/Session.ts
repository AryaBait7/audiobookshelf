import sequelizeLib = require('sequelize')
import type { CreationOptional, InferAttributes, InferCreationAttributes, NonAttribute, Sequelize } from 'sequelize'
import type User = require('./User')

const { DataTypes, Model, Op } = sequelizeLib

class Session extends Model<InferAttributes<Session>, InferCreationAttributes<Session>> {
  // Attributes are Sequelize getters/setters on the prototype: `declare` (no emitted class field)
  declare id: CreationOptional<string>
  declare ipAddress: string | null
  declare userAgent: string | null
  declare refreshToken: string
  declare createdAt: CreationOptional<Date>
  declare updatedAt: CreationOptional<Date>
  declare userId: string
  declare expiresAt: Date
  declare lastRefreshToken: CreationOptional<string | null>
  declare lastRefreshTokenExpiresAt: CreationOptional<Date | null>

  // Expanded properties

  declare user?: NonAttribute<User>

  constructor(values?: ConstructorParameters<typeof Model<InferAttributes<Session>, InferCreationAttributes<Session>>>[0], options?: sequelizeLib.BuildOptions) {
    super(values, options)
  }

  static async createSession(userId: string, ipAddress: string | null, userAgent: string | null, refreshToken: string, expiresAt: Date): Promise<Session> {
    const session = await Session.create({ userId, ipAddress, userAgent, refreshToken, expiresAt })
    return session
  }

  /**
   * Clean up expired sessions from the database
   * @returns Number of sessions deleted
   */
  static async cleanupExpiredSessions(): Promise<number> {
    const deletedCount = await Session.destroy({
      where: {
        expiresAt: {
          [Op.lt]: new Date()
        }
      }
    })
    return deletedCount
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
        ipAddress: DataTypes.STRING,
        userAgent: DataTypes.STRING,
        refreshToken: {
          type: DataTypes.STRING,
          allowNull: false
        },
        expiresAt: {
          type: DataTypes.DATE,
          allowNull: false
        },
        lastRefreshToken: {
          type: DataTypes.STRING,
          allowNull: true
        },
        lastRefreshTokenExpiresAt: {
          type: DataTypes.DATE,
          allowNull: true
        }
      },
      {
        sequelize,
        modelName: 'session'
      }
    )

    const { user } = sequelize.models
    user.hasMany(Session, {
      onDelete: 'CASCADE',
      foreignKey: {
        allowNull: false
      }
    })
    Session.belongsTo(user)
  }
}

export = Session
