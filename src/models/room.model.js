"use strict";

module.exports = (sequelize, DataTypes) => {
  const Room = sequelize.define(
    "Room",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },

      room_id: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },

      room_name: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      created_by: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      participants: {
        type: DataTypes.JSON,
        defaultValue: [],
      },

      room_type: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      is_private: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
    },
    {
      tableName: "rooms",
      timestamps: true,
      underscored: true,
    },
  );

  Room.associate = (models) => {
    Room.belongsTo(models.User, {
      foreignKey: "created_by",
      as: "creator",
    });

    Room.hasMany(models.Message, {
      foreignKey: "room_id",
      sourceKey: "room_id",
      as: "messages",
    });


    Room.hasMany(models.SessionRoom, {
      foreignKey: "room_id",
      sourceKey: "room_id",
      as: "session_rooms",
    });

    Room.hasMany(models.CodeSnapshot, {
      foreignKey: "room_id",
      sourceKey: "room_id",
      as: "code_snapshots",
    });
  };

  return Room;
};
