'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Spots extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Spots.belongsTo(models.User, { as: 'Owner', foreignKey: 'userId' })
      Spots.hasMany(models.SpotImage, { foreignKey: 'spotId', onDelete: 'cascade', hooks: true })
      Spots.hasMany(models.Booking, { foreignKey: 'spotId', onDelete: 'cascade', hooks: true })
      Spots.hasMany(models.Review, { foreignKey: 'spotId', onDelete: 'cascade', hooks: true })
    }
  }
  Spots.init({
    ownerId:{
      type: DataTypes.INTEGER,
      allowNull : false
    },
    address: {
      type: DataTypes.STRING,
      allowNull : false
    },
    city: {
      type: DataTypes.STRING,
      allowNull : false
    },
    state: {
      type: DataTypes.STRING,
      allowNull : false
    },
    country: {
      type: DataTypes.STRING,
      allowNull : false
    },
    lat: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull : false
    },
    lng: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull : false
    },
    name: {
      type: DataTypes.STRING,
      allowNull : false
    },
    description: {
      type: DataTypes.STRING,
      allowNull : false
    },
  }, {
    sequelize,
    modelName: 'Spots',
  });
  return Spots;
};
