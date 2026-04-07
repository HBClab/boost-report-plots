import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, '../public');
const dataFile = path.resolve(__dirname, '../../../data/zone_out.csv');

const app = express();
const port = Number(process.env.PORT ?? 3000);

app.use(express.static(publicDir));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/data/zone_out.csv', (_req, res) => {
  res.type('text/csv');
  res.sendFile(dataFile, (error) => {
    if (error) {
      if (!res.headersSent) {
        res.status(404).json({ error: 'CSV file not found' });
      }
    }
  });
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

app.listen(port, () => {
  console.log(`[hr-dashboard] listening on http://localhost:${port}`);
});
