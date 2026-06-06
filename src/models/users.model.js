"use strict";

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define(
    "User",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },

      username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          len: [6, 100],
        },
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      is_verified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },

      full_name: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      profile_pic: {
        type: DataTypes.STRING,
      },

      role_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      failed_login_attempts: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      locked_until: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: null,
      },
      lockout_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    },
    {
      tableName: "users",
      timestamps: true,
      underscored: true,
      createdAt: "created_at",

      updatedAt: "updated_at",
    },
  );

  User.associate = (models) => {
    User.belongsTo(models.Role, {
      foreignKey: "role_id",
      as: "role",
    });
    User.hasMany(models.Room, {
      foreignKey: "created_by",
      as: "created_rooms",
    });
  };

  return User;
};
