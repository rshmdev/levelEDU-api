import chalk from 'chalk';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

const { cyan, yellow, red } = chalk;

const connected = cyan;
const error = yellow;
const disconnected = red;

const Connect = () => {
  const mongoUri = process.env.MONGO_URI || process.env.DB_URI;
  
  if (!mongoUri) {
    console.log(error('MONGO_URI não está definida no arquivo .env'));
    process.exit(1);
  }

  mongoose.connect(mongoUri, {});

  mongoose.connection.on('connected', () => {
    console.log(
      connected(`Mongoose default connection is open to ${mongoUri}`)
    );
  });

  mongoose.connection.on('error', (err) => {
    console.log(error(`Mongoose default connection has occurred ${err} error`));
  });

  mongoose.connection.on('disconnected', () => {
    console.log(disconnected('Mongoose default connection is disconnected'));
  });
};

export default Connect;
