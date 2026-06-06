"use strict";

module.exports = (sequelize, DataTypes) => {
  const CodeSnapshot = sequelize.define(
    "CodeSnapshot",
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

      code: {
        type: DataTypes.TEXT,
        allowNull: false,
      },

      language: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      tableName: "code_snapshots",
      timestamps: true,
      underscored: true,
    },
  );

  CodeSnapshot.associate = (models) => {
    CodeSnapshot.belongsTo(models.Room, {
      foreignKey: "room_id",
      targetKey: "room_id",
      as: "room",
    });
  };

  return CodeSnapshot;
};
