"use strict";

module.exports = (sequelize, DataTypes) => {

  const Message = sequelize.define(
    "Message",
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

      sender: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      message: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
    },
    {
      tableName: "messages",
      timestamps: true,
      underscored: true,
    }
  );

  Message.associate = (models) => {

    Message.belongsTo(models.Room, {
      foreignKey: "room_id",
      targetKey: "room_id",
      as: "room",
    });

    Message.belongsTo(models.User, {
      foreignKey: "sender",
      as: "sender_user",
    });

  };

  return Message;
};