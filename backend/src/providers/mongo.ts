import mongoose from 'mongoose';
import { config } from '../shared/config';
import { log } from '../shared/logger';

export async function connectMongo() {
  mongoose.set('strictQuery', true);
  await mongoose.connect(config.mongoUri); // Atlas (AWS) via SRV
  log.info('Mongo connected (Atlas)');
  mongoose.connection.on('error', (e) => log.error('Mongo error:', e));
}
