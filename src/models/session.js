"use strict";

module.exports = (sequelize, DataTypes) => {

  const SessionRoom = sequelize.define(
    "SessionRoom",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },

      room_id: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      started_at: {
        type: DataTypes.DATE,
      },

      end_at: {
        type: DataTypes.DATE,
      },

      final_code: {
        type: DataTypes.TEXT,
      },

      whiteboard_data: {
        type: DataTypes.JSON,
      },

      participants: {
        type: DataTypes.JSON,
        defaultValue: [],
      },
    },
    {
      tableName: "sessions_rooms",
      timestamps: true,
      underscored: true,
    }
  );

  SessionRoom.associate = (models) => {

    SessionRoom.belongsTo(models.Room, {
      foreignKey: "room_id",
      targetKey: "room_id",
      as: "room",
    });

  };

  return SessionRoom;
};