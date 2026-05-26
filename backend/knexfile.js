require('dotenv').config();

module.exports = {
  development: {
    client: process.env.DATABASE_URL ? 'pg' : 'sqlite3',
    connection: process.env.DATABASE_URL || {
      filename: './src/database/db.sqlite3'
    },
    useNullAsDefault: !process.env.DATABASE_URL,
    pool: process.env.DATABASE_URL ? {
      min: 2,
      max: 10
    } : undefined,
    migrations: {
      directory: './src/database/migrations'
    },
    seeds: {
      directory: './src/database/seeds'
    }
  },

  production: {
    client: 'pg',
    connection: process.env.DATABASE_URL,
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      directory: './src/database/migrations'
    },
    seeds: {
      directory: './src/database/seeds'
    }
  }
};
