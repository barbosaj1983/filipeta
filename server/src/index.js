import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import pino from 'pino';
import pinoHttp from 'pino-http';
import routes from './routes.js';

const app = express();
const PORT = process.env.PORT || 8080;
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: '*', // ajuste se hospedar front na web
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));
app.use(express.json({ limit: '1mb' }));
app.use(pinoHttp({ logger }));

app.get('/health', (_req, res) => {
  res.json({ ok: true, env: process.env.APP_ENV || 'dev', time: new Date().toISOString() });
});

app.use('/', routes);

// Handler global de erros
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  // pino-http injeta logger em req.log
  try { req.log?.error({ err }, 'unhandled_error'); } catch {}
  res.status(500).json({ error: 'Erro interno' });
});

app.listen(PORT, () => logger.info(`BFF ouvindo em http://0.0.0.0:${PORT}`));
