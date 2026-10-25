# Pyro-Suit: IoT Safety Monitoring for Pyrotechnicians

A web app prototype of an IoT-enabled protective suit that monitors the air a pyrotechnician breathes and warns them before exposure becomes dangerous.

> **Status:** working prototype using simulated sensor data. It is a student project, not certified safety equipment.

**Live demo:** `<add Vercel link>`  |  **API:** `<add Render link>` (docs at `/docs`)

## The problem

Pyrotechnicians work close to smoke, combustion gases and fine particles. Exposure builds up quietly and is rarely measured on the person doing the work. This project puts the sensors on the suit, so the wearer and a supervisor can see exposure as it happens.

## What the prototype does

- Shows simulated readings from two shoulder gas modules (CO, SO2, O2) and a rear dust module (PM2.5, PM10)
- Classifies each reading as safe, caution or hazard against configurable limits
- Confirms a hazard only after a **dwell time** and **two-sided corroboration**, so a single sensor glitch does not trigger an alarm
- Escalates through four levels: SAFE, CAUTION, HAZARD (fan and vibration on) and CRITICAL (leave the area)
- Detects a faulty sensor (frozen or out-of-range value) and ignores it until it recovers
- Keeps the fan on briefly after the air clears, with a manual override
- Includes demo scenarios, a live event log, trend graphs, an alert timeline, editable limits and built-in self-tests

## Repository structure

```
pyro-suit/
  frontend/   React dashboard (Vite). Runs on its own simulator today
  backend/    FastAPI API, SQLite storage, and the Python detector
  cad/        Suit and module CAD files, exported images
  README.md
  .gitignore
```

## Tech stack

| Part | Tools |
|---|---|
| Frontend | React 18, Vite, Recharts, Framer Motion, Lucide icons |
| Backend | Python, FastAPI, Uvicorn |
| Database | SQLite |
| Design | CAD (see `cad/`) |
| Hosting | Vercel (frontend), Render (backend) |

## Run it locally

You need Python 3.10+ and Node.js 18+.

**Frontend** (this alone is enough to see the full demo)

```bash
cd frontend
npm install
cp .env.example .env     # points the dashboard at the local backend; delete the line to run with no backend
npm run dev
```

Open the address Vite prints (usually `http://localhost:5173`).

**Backend**

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

The API runs at `http://127.0.0.1:8000`. Open `http://127.0.0.1:8000/docs` to try every endpoint in the browser.

**Detector tests and console demo**

```bash
cd backend
pip install -r requirements-dev.txt
python -m pytest        # detector and storage tests
python simulate.py      # pick a scenario and watch the alert levels second by second
```

## How detection works

1. Each reading is compared with its caution and hazard limit. For oxygen, lower values are worse.
2. A hazard reading must last for a **dwell time** before it counts. If both sides agree (or dust and a gas agree), it is confirmed quickly. If only one side reports it, the system waits longer.
3. A brief spike never reaches the dwell time, so it is ignored.
4. A hazard that keeps going escalates to CRITICAL.
5. At HAZARD the fan and vibration motor start, and the fan stays on for a few seconds after the air clears.

The dwell times, escalation time and fan hold-off are team design choices and are set in one place in `backend/detector.py`.

## Alert limits

Defined in `backend/thresholds.py`, each with its source in a comment.

| Gas | Caution | Hazard | Source |
|---|---|---|---|
| CO (ppm) | 35 | 50 | NIOSH REL, OSHA PEL |
| SO2 (ppm) | 2 | 5 | NIOSH REL, OSHA PEL |
| O2 (%, low side) | 20.0 | 19.5 | Hazard: OSHA 29 CFR 1910.146. Caution: team choice |
| PM2.5 (ug/m3) | 35 | 75 | Caution: EPA outdoor standard. Hazard: team choice |

OSHA and NIOSH values are 8-hour averages. Using them as live alarm points is deliberately conservative.

## Demo scenarios

| Scenario | What it shows |
|---|---|
| Firework burst | Gas and dust spike on both sides, so the fan, vibration and alert trigger quickly |
| Enclosed area | Oxygen drops and CO builds up |
| Source on the left | Only one shoulder sees the gas, so confirmation is slower |
| Sensor glitch | One false spike is filtered out |
| Sensor fault | A frozen CO sensor is flagged and ignored |

## API

The dashboard sends one snapshot per second to `POST /tick`. The backend runs the detector, saves the reading and writes an event whenever the alert level or the fan changes.

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/tick` | Send one snapshot, get the alert level, fan and vibration state |
| GET | `/readings` | Latest saved readings (`limit`, `wearer`) |
| GET | `/events` | Alert and fan events |
| GET | `/summary` | Exposure summary: samples per level, worst readings, number of hazard alerts |
| GET | `/thresholds` | Current limits and timings |
| GET | `/export.csv` | All readings as CSV |
| POST | `/reset` | Reset detector timers (use before a demo) |

Example `POST /tick` body:

```json
{"wearer": "W01", "co_left": 60, "co_right": 58, "so2_left": 0.3, "so2_right": 0.3,
 "o2_left": 20.9, "o2_right": 20.9, "pm25": 13}
```

The frontend (`frontend/src/logic.js`) and the backend (`backend/detector.py`) use the same limits and timings, so they give the same alert level for the same readings. If you change one, change the other.

## Deployment

- **Frontend:** Vercel. Root directory `frontend`, environment variable `VITE_API_URL` set to the backend URL.
- **Backend:** Render. Root directory `backend`, build command `pip install -r requirements.txt`, start command `uvicorn main:app --host 0.0.0.0 --port $PORT`.
- The free Render plan sleeps when idle and forgets the SQLite file when it restarts. The dashboard keeps working without the backend, but saved history is lost on a restart. Use `/export.csv` before a presentation.

## Current status and next steps

- The dashboard runs on its built-in simulator and sends every second to the backend, which stores it. The dashboard's alert display is still calculated in the browser.
- **Next:** make the dashboard show the alert level returned by the API instead of its own calculation.
- Then: real hardware, such as an ESP32 with gas and dust sensors posting to `/tick`.
- PM10 is currently a simulated value (1.8 times PM2.5). It is not measured or used for alerts.
- Later: wearer login, several wearers on one dashboard, push alerts to a supervisor's phone, and a hosted database.

## Team

| Name | Role |
|---|---|
| Prabhu | Frontend and CAD design |
| Perumal | Frontend, detection logic and CAD design |
| Sujatha | Backend, API and database |
| Anisha | Testing and documentation |

## License

`<choose one, for example MIT, or remove this section>`
