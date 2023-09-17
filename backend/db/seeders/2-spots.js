'use strict';

let options = {};
if (process.env.NODE_ENV === 'production') {
  options.schema = process.env.SCHEMA;  // define your schema in options object
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    options.tableName = 'Spots';
    return queryInterface.bulkInsert(options, [
      {
        userId: 1,
        address: "123 Disney Lane",
        city: "San Francisco",
        state: "California",
        country: "United States of America",
        lat: 37.7645358,
        lng: -122.4730327,
        name: "App Academy",
        description: "Place where web developers are created",
        price: 123
      },
      {
        userId: 1,
        address: "321 Destiny Way",
        city: "San Antonio",
        state: "Texas",
        country: "United States of America",
        lat: 41.9854581,
        lng: -110.9573126,
        name: "Texas Roadhouse",
        description: "Minutes away from the Alamo",
        price: 149
      },
      {
        userId: 2,
        address: "987 Lemon Street",
        city: "Atlantic Beach",
        state: "Florida",
        country: "United States of America",
        lat: 31.1234567,
        lng: -80.8472957,
        name: "Sandy Beach",
        description: "The beach getaway of your dreams",
        price: 203
      },
      {
        userId: 3,
        address: "707 Music City Drive",
        city: "Nashville",
        state: "Tennessee",
        country: "United States of America",
        lat: 40.1357924,
        lng: -85.9870341,
        name: "Mountain Living",
        description: "A stroll away from honky-tonk nights",
        price: 175
      }
    ], {});
  },

  async down(queryInterface, Sequelize) {
    options.tableName = 'Spots';
    const Op = Sequelize.Op;
    return queryInterface.bulkDelete(options, {
      userId: { [Op.in]: [1, 2, 3] }
    }, {});
  }
};
