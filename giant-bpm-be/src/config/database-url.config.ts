/**
 * Constructs DATABASE_URL from environment variables
 * Reads DB credentials directly from environment variables (no Secrets Manager)
 */
export function constructDatabaseUrl(): string {
  const dbHost = process.env.DB_HOST;
  const dbUser = process.env.DB_USER;
  const dbPassword = process.env.DB_PASSWORD;
  const dbName = process.env.DB_NAME;
  const dbSchema = process.env.DB_SCHEMA;
  const dbPort = process.env.DB_PORT || '5432';

  // Validate required environment variables
  if (!dbHost || !dbUser || !dbPassword || !dbName || !dbSchema) {
    const missing: string[] = [];
    if (!dbHost) missing.push('DB_HOST');
    if (!dbUser) missing.push('DB_USER');
    if (!dbPassword) missing.push('DB_PASSWORD');
    if (!dbName) missing.push('DB_NAME');
    if (!dbSchema) missing.push('DB_SCHEMA');

    throw new Error(
      `Missing required database environment variables: ${missing.join(', ')}`,
    );
  }

  console.log(
    '[DatabaseConfig] Constructing DATABASE_URL from environment variables...',
  );

  // URL encode username and password to handle special characters
  const encodedUsername = encodeURIComponent(dbUser);
  const encodedPassword = encodeURIComponent(dbPassword);

  // Construct DATABASE_URL
  const databaseUrl = `postgresql://${encodedUsername}:${encodedPassword}@${dbHost}:${dbPort}/${dbName}?schema=${dbSchema}`;

  console.log('[DatabaseConfig] ✓ Database URL constructed successfully');
  console.log(
    '[DatabaseConfig] Connection string:',
    `${dbUser}@${dbHost}:${dbPort}/${dbName}?schema=${dbSchema}`,
  );

  return databaseUrl;
}
