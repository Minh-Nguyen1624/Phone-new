const {
  DB_USER = "root",
  DB_PASS = "123456",
  DB_HOST = "27017",
  DB_PORT = "8080",
  DB_NAME = "StorePhone",
} = process.env;

export const url = `mongodb://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${DB_NAME}?authSource=admin`;
