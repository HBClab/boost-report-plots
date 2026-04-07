import app from './app.js';

const PORT = process.env.PORT ?? 3000;

app.listen(PORT, () => {
  const dbUrl = process.env.ACTIGRAPHY_DB_URL ?? '(not set)';
  const safeUrl = dbUrl.replace(/\/\/[^@]+@/, '//***@');
  console.log(`act-plots server listening on http://localhost:${PORT}`);
  console.log(`Database: ${safeUrl}`);
});
