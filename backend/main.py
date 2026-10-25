import os

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel, Field

from service import Monitor

app = FastAPI(title="Pyro-Suit API", version="1.0")

# CORS_ORIGINS="https://your-app.vercel.app" on Render locks the API to your site.
# Left unset it allows everyone, which is fine for a demo.
origins = [o.strip() for o in os.getenv("CORS_ORIGINS", "*").split(",")]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_methods=["*"], allow_headers=["*"])

monitor = Monitor(os.getenv("DB_PATH", "pyro.db"))


class Snapshot(BaseModel):
    """One second of sensor data from one suit."""
    wearer: str = Field("W01", max_length=32)
    co_left: float = Field(..., ge=0, le=5000)    # ppm
    co_right: float = Field(..., ge=0, le=5000)
    so2_left: float = Field(..., ge=0, le=1000)   # ppm
    so2_right: float = Field(..., ge=0, le=1000)
    o2_left: float = Field(..., ge=0, le=100)     # % by volume
    o2_right: float = Field(..., ge=0, le=100)
    pm25: float = Field(..., ge=0, le=10000)      # ug/m3


@app.get("/")
def root():
    return {"service": "Pyro-Suit API", "status": "ok", "docs": "/docs"}


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/tick")
def tick(s: Snapshot):
    """Send one snapshot per second. Returns the alert level, fan and vibration state."""
    data = s.model_dump()
    wearer = data.pop("wearer")
    return monitor.tick(wearer, data)


@app.get("/readings")
def readings(limit: int = Query(60, ge=1, le=1000), wearer: str | None = None):
    return monitor.readings(limit, wearer)


@app.get("/events")
def events(limit: int = Query(50, ge=1, le=500), wearer: str | None = None):
    return monitor.events(limit, wearer)


@app.get("/summary")
def summary(wearer: str | None = None):
    return monitor.summary(wearer)


@app.get("/thresholds")
def thresholds():
    return monitor.thresholds()


@app.get("/export.csv")
def export_csv(wearer: str | None = None):
    return Response(monitor.csv_text(wearer), media_type="text/csv",
                    headers={"Content-Disposition": 'attachment; filename="pyro-suit-readings.csv"'})


@app.post("/reset")
def reset(wearer: str | None = None):
    monitor.reset(wearer)
    return {"ok": True}
