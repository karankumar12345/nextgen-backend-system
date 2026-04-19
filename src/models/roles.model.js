"use strict";


module.exports = (sequelize, DataTypes) => {
  const Roles = sequelize.define(
    "Role",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
    },
    {
      tableName: "roles",
      timestamps: true,
      underscored: true,
    },
  );
  Roles.associate = (models) => {
    Roles.hasMany(models.User, {    
        foreignKey: "role_id",
        as: "users",    
    });
  };
  return Roles;
};
