# Pyro-Suit: IoT Safety Monitoring for Pyrotechnicians

A web app prototype of an IoT-enabled protective suit that monitors the air a pyrotechnician breathes and warns them before exposure becomes dangerous. Sensors on the suit measure toxic gases and fine dust. A detector decides whether a reading is a real hazard or a false alarm, and a live dashboard shows the result to the wearer and a supervisor.

> **Status:** working prototype using simulated sensor data. It is a student project, not certified safety equipment.

**Live dashboard:** `https://pyrotechnicsuit-9jh181m3c-datame2.vercel.app/`  

## Team

| Name | Contribution |
|---|---|
| Santhosh Prabhu | Frontend dashboard (React): suit view, live readings, trend graphs, alert timeline, event log, limits panel. CAD design |
| Santhosh Perumal | Detection logic (`detector.py`, `thresholds.py` with OSHA/NIOSH sources, simulator and tests). Frontend. CAD design |
| Sujatha S | Backend (FastAPI API and SQLite database), connecting the dashboard to the backend, repository setup and deployment |
| Anisha T | Documentation (this README and the project write-up), testing and results |

The repository was assembled and first pushed by Sujatha S on behalf of the team. Each member's own work is in the folders listed below, and individual commits are in the Git history.

## The problem

Pyrotechnicians work close to smoke, combustion gases and fine particles. Exposure builds up quietly and is rarely measured on the person doing the work. This project puts the sensors on the suit, so the wearer and a supervisor can see exposure as it happens.

## What the prototype does

- Shows simulated readings from two shoulder gas modules (CO, SO2, O2) and a rear dust module (PM2.5)
- Classifies each reading as safe, caution or hazard against configurable limits
- Confirms a hazard only after a **dwell time** and **two-sided corroboration**, so a single sensor glitch does not trigger an alarm
- Escalates through four levels: SAFE, CAUTION, HAZARD (fan and vibration on) and CRITICAL (leave the area)
- Detects a faulty sensor (frozen or out-of-range value) and ignores it until it recovers
- Keeps the fan on briefly after the air clears, with a manual override
- Saves every reading and alert to a database, with a CSV export and an exposure summary
- Includes demo scenarios, trend graphs, an alert timeline, editable limits and built-in self-tests

## System overview

```
Simulated sensors (browser)
        |  one snapshot per second
        v
FastAPI backend  -->  Detector  -->  SQLite database
        |
        v
  Events, readings, summary, CSV export
```

The dashboard runs its own copy of the detection rules so it works even when the backend is off. The backend runs the same rules and records the results. Both use the same limits and timings, and a comparison on five scenarios gave identical alert levels and fan states.

## Repository structure

```
Pyrotechnic-Suit/
  frontend/   React dashboard (Vite)
  backend/    FastAPI app, SQLite storage, detector, tests
  cad/        Suit and module CAD files, exported images
  README.md
  .gitignore
```

| Backend file | What it does |
|---|---|
| `main.py` | FastAPI app: the URLs, input checking and CORS |
| `service.py` | SQLite storage and the glue between the API and the detector |
| `detector.py` | The detection rules (dwell time, corroboration, escalation, fan hold-off) |
| `thresholds.py` | Alert limits, each with its source |
| `simulate.py` | Console demo of the scenarios |
| `test_detector.py`, `test_service.py` | Automated tests |

## Tech stack

| Part | Tools |
|---|---|
| Frontend | React 18, Vite, Recharts, Framer Motion, Lucide icons |
| Backend | Python, FastAPI, Uvicorn |
| Database | SQLite (Python's built-in `sqlite3`) |
| Design | CAD (see `cad/`) |
| Hosting | Vercel (frontend), Render (backend) |

## How detection works

1. Each reading is compared with its caution and hazard limit. For oxygen, lower values are worse.
2. A hazard reading must last for a **dwell time** before it counts:
   - **2 seconds** if both shoulders agree, or the dust sensor reports it
   - **6 seconds** if only one shoulder reports it
3. A brief spike never reaches the dwell time, so it is ignored.
4. A hazard that keeps going for 7 more seconds after confirmation becomes **CRITICAL**.
5. At HAZARD the fan and vibration motor start. The fan stays on for about 4 seconds after the air clears.

The timings are team design choices, set in one place in `backend/detector.py`.

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

## Run it locally

You need Python 3.10+ and Node.js 18+.

**Backend**

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

If `uvicorn` is not recognised on Windows, use `python -m uvicorn main:app --reload`. The API runs at `http://127.0.0.1:8000`, and `http://127.0.0.1:8000/docs` lets you try every endpoint in the browser.

**Frontend**

```bash
cd frontend
npm install
copy .env.example .env     (Mac/Linux: cp .env.example .env)
npm run dev
```

Open the address Vite prints (usually `http://localhost:5173`). Delete the line in `.env` to run the dashboard with no backend.

**Tests**

```bash
cd backend
pip install -r requirements-dev.txt
python -m pytest
```

There are 13 automated backend tests, plus 7 self-tests that run inside the dashboard under "About and tests".

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

## Deployment

- **Backend on Render:** root directory `backend`, build command `pip install -r requirements.txt`, start command `uvicorn main:app --host 0.0.0.0 --port $PORT`.
- **Frontend on Vercel:** root directory `frontend`, environment variable `VITE_API_URL` set to the Render URL (no trailing slash).
- The free Render plan sleeps when idle and loses the SQLite file when it restarts. The dashboard keeps working without the backend, but saved history is lost on a restart, so download `/export.csv` after any run you need.

## Limitations and future work

- Sensor data is simulated. The next step is real hardware, such as an ESP32 with gas and dust sensors posting readings to `/tick`.
- The dashboard still shows the alert it calculates itself. A next step is to show the alert returned by the API.
- PM10 on the dashboard is a simulated value (1.8 times PM2.5). It is not measured or used for alerts.
- Alert limits should be reviewed against current safety standards before any real-world use.
- Later: wearer login, several wearers on one dashboard, push alerts to a supervisor's phone, and a hosted database for permanent storage.

