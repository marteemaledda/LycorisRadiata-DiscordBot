import { MongoClient } from 'mongodb';
import 'dotenv/config';


const client = new MongoClient(process.env.MONGODB_URI);
let db;

async function connectDB() {
  try {
    await client.connect();
    console.log('Successfully connected to MongoDB via Native Driver!');
    db = client.db('discord_bot_db'); 
    return db;
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    process.exit(1);
  }
}

function getDb() {
  if (!db) {
    throw new Error('Database not initialized! Call connectDB first.');
  }
  return db;
}

export { 
    connectDB,
    getDb 
};