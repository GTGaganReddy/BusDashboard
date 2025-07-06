import { setupPermanentDatabase } from './server/setup-database';

async function main() {
  try {
    await setupPermanentDatabase();
    console.log('Database initialization completed successfully!');
  } catch (error) {
    console.error('Database initialization failed:', error);
    process.exit(1);
  }
}

main();