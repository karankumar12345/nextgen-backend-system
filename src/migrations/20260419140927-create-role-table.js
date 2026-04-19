'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('roles', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },

      name: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },

      created_at: {
  type: Sequelize.DATE,
  allowNull: false,
  defaultValue: Sequelize.NOW,
},

updated_at: {
  type: Sequelize.DATE,
  allowNull: false,
  defaultValue: Sequelize.NOW,
},
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('roles');
  },
};