# Vestuviu RSVP backend (Railway + Postgres)

Node.js (20+) Express backend, kuris priima RSVP iš esamo React front-end ir įrašo į Railway Postgres per Prisma.

## Endpoint’ai

- `GET /healthz` → `200 { ok: true }`
- `POST /api/rsvp` → `200 { ok: true }` arba `400 { ok: false, error: "..." }`

### `POST /api/rsvp` payload

Front-end siunčia (kontraktas):

```json
{
  "wedding": { "groom": "Deividas", "bride": "Aistė", "dateISO": "2026-06-25T14:00:00+03:00" },
  "rsvp": { "name": "Vardas Pavardė", "attending": "taip", "guests": 2, "diet": "", "note": "" },
  "submittedAtISO": "2026-02-09T12:34:56.789Z",
  "source": "web"
}
```

Minimalūs validacijos reikalavimai:
- `rsvp.name` privalomas, ne tuščias
- `rsvp.attending` privalomas
- `rsvp.guests` turi būti skaičius `1–6`

## Konfigūracija (env)

Sukurkite `backend/.env` pagal `.env.example`:

- `DATABASE_URL` – Railway Postgres URL
- `PORT` – pvz. `8080` (Railway dažnai nustato pats)
- `CORS_ORIGIN` – leidžiamas front-end origin (pvz. `http://localhost:3000`)

Pastaba: `CORS_ORIGIN` gali būti keli origin’ai, atskirti kableliais. Jei nustatysite `*`, bus leidžiami visi.

## Lokalūs veiksmai (dev)

1) Install:

```bash
cd backend
npm i
```

2) Prisma migracija (reikia veikiančio Postgres `DATABASE_URL`):

```bash
npx prisma migrate dev --name init
```

3) Start (watch mode):

```bash
npm run dev
```

Backend bus pasiekiamas per `http://localhost:8080` (jei `PORT=8080`).

## Railway deploy

1) Railway sukurkite projektą ir pridėkite `PostgreSQL` (Railway duos `DATABASE_URL`).

2) Deploy backend kaip atskirą service iš GitHub repo:

- **Root Directory**: `backend`
- **Env**:
  - `DATABASE_URL` (iš Railway Postgres)
  - `CORS_ORIGIN` (jūsų front-end domenas)
  - `PORT` (nebūtina – Railway dažnai nustato pats)

3) Migracijos deploy metu:

Variantas A (rekomenduojama): Railway nustatykite **Deploy Command** arba **Build Command**:

```bash
npm run prisma:migrate
```

Variantas B: paleisti migracijas prieš start (jei norite, galite pakeisti Railway Start Command į):

```bash
npm run prisma:migrate && npm start
```

## Front-end sujungimas

Front-end env (jo hosting’e) nustatykite:

- `REACT_APP_API_BASE_URL=https://<jusu-backend>.up.railway.app`
- `REACT_APP_RSVP_POST_ENABLED=true`

Jei naudojate kitą endpoint’ą, keiskite `REACT_APP_RSVP_ENDPOINT`, bet pagal nutylėjimą turi veikti `POST /api/rsvp`.
