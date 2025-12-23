import { MongoClient, Db } from "mongodb";

const url = process.env.MONGO_URL || "mongodb://localhost:27017/"; // your MongoDB URI
const dbName = "auth-demo"; // database name
let db: Db;

export async function connectToDB() {
  if (db) return db;

  const client = new MongoClient(url);
  await client.connect();
  db = client.db(dbName);
  console.log("Connected to MongoDB");
  return db;
}
