const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { z } = require('zod');
const { PrismaClient } = require('@prisma/client');

require('dotenv').config();

const prisma = new PrismaClient();

const app = express();
app.set('trust proxy', 1);

app.use(helmet());
app.use(express.json({ limit: '1mb' }));

const corsOriginRaw = process.env.CORS_ORIGIN;
if (!corsOriginRaw) {
  app.use(cors({ origin: 'http://localhost:3000' }));
} else if (corsOriginRaw.trim() === '*') {
  app.use(cors());
} else {
  const origins = corsOriginRaw
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.use(
    cors({
      origin: origins,
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type'],
    })
  );
}

app.get('/healthz', (req, res) => {
  res.status(200).json({ ok: true });
});

const rsvpLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'Rate limit exceeded' },
});

const payloadSchema = z.object({
  wedding: z.object({
    groom: z.string().trim().min(1).max(100),
    bride: z.string().trim().min(1).max(100),
    dateISO: z.string().trim().min(1).max(50),
  }),
  rsvp: z.object({
    name: z.string().trim().min(1).max(200),
    attending: z.string().trim().min(1).max(20),
    guests: z.number().int().min(1).max(6),
    diet: z.string().trim().max(1000).optional(),
    note: z.string().trim().max(2000).optional(),
  }),
  submittedAtISO: z
    .string()
    .trim()
    .datetime({ offset: true })
    .optional(),
  source: z.string().trim().max(50).optional().default('web'),
});

function zodErrorToMessage(error) {
  const first = error.issues?.[0];
  if (!first) return 'Invalid payload';
  const path = first.path?.length ? first.path.join('.') : 'payload';
  return `${path}: ${first.message}`;
}

app.post('/api/rsvp', rsvpLimiter, async (req, res) => {
  const parsed = payloadSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: zodErrorToMessage(parsed.error) });
  }

  const { wedding, rsvp, submittedAtISO, source } = parsed.data;
  const submittedAt = submittedAtISO ? new Date(submittedAtISO) : null;
  if (submittedAt && Number.isNaN(submittedAt.getTime())) {
    return res.status(400).json({ ok: false, error: 'submittedAtISO: Invalid datetime' });
  }

  try {
    await prisma.rsvp.create({
      data: {
        submittedAt: submittedAt || undefined,
        name: rsvp.name,
        attending: rsvp.attending,
        guests: rsvp.guests,
        diet: rsvp.diet || undefined,
        note: rsvp.note || undefined,
        weddingGroom: wedding.groom,
        weddingBride: wedding.bride,
        weddingDateISO: wedding.dateISO,
        source,
        ip: req.ip || undefined,
        userAgent: req.get('user-agent') || undefined,
      },
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Failed to save RSVP:', err);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

const port = Number(process.env.PORT || 8080);
app.listen(port, () => {
  console.log(`Backend listening on port ${port}`);
});

async function shutdown(signal) {
  try {
    console.log(`Received ${signal}, shutting down...`);
    await prisma.$disconnect();
  } finally {
    process.exit(0);
  }
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
