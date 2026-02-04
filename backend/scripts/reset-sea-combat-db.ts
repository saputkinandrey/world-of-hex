import 'dotenv/config';
import mongoose from 'mongoose';

type DbConfig = {
  url?: string;
  host?: string;
  port?: string;
  username?: string;
  password?: string;
  name?: string;
};

const collections = ['players', 'ships', 'encounters'];

const getConfig = (): DbConfig => ({
  url: process.env.DATABASE_URL,
  host: process.env.DATABASE_HOST ?? 'localhost',
  port: process.env.DATABASE_PORT ?? '27017',
  username: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD,
  name: process.env.DATABASE_NAME,
});

const buildMongoUri = (config: DbConfig) => {
  if (config.url) {
    return config.url;
  }

  const auth =
    config.username && config.password
      ? `${encodeURIComponent(config.username)}:${encodeURIComponent(
          config.password,
        )}@`
      : '';

  const dbName = config.name ? `/${config.name}` : '';
  return `mongodb://${auth}${config.host}:${config.port}${dbName}`;
};

const dropCollections = async () => {
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('MongoDB connection is not ready.');
  }

  const existing = await db
    .listCollections({}, { nameOnly: true })
    .toArray();
  const existingNames = new Set(existing.map((col) => col.name));

  for (const name of collections) {
    if (existingNames.has(name)) {
      await db.dropCollection(name);
      // eslint-disable-next-line no-console
      console.log(`Dropped collection: ${name}`);
    } else {
      // eslint-disable-next-line no-console
      console.log(`Skipped (not found): ${name}`);
    }
  }
};

const run = async () => {
  const config = getConfig();
  const uri = buildMongoUri(config);

  await mongoose.connect(uri);
  try {
    await dropCollections();
  } finally {
    await mongoose.disconnect();
  }
};

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
