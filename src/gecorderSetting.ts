import NodeGeocoder from 'node-geocoder';


const options: NodeGeocoder.Options = {
  provider: 'google',
  language: 'ja',
  apiKey: process.env.GOOGLE_API_KEY,
  formatter: null
};

const geocoder = NodeGeocoder(options);

export default geocoder;
