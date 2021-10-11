const NodeGeocoder = require('node-geocoder');

const options = {
  provider: 'google',
  language: 'ja',
  apiKey: process.env.GOOGLE_API_KEY,
  formatter: null
};

const geocoder = NodeGeocoder(options);

module.exports = geocoder;
