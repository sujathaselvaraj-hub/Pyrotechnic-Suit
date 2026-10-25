"""Storage + detector glue. No web framework in here, so it is easy to test.

One Monitor holds a Detector per wearer, saves every reading to SQLite and writes
an event row whenever the alert level or the fan changes.
"""
import csv
import io
import sqlite3
import threading
import time
from contextlib import contextmanager
from datetime import datetime, timezone

import detector as det
from detector import NAMES, Detector
from thresholds import LIMITS

FIELDS = ["co_left", "co_right", "so2_left", "so2_right", "o2_left", "o2_right", "pm25"]
GAP_RESET_S = 5  # no data for this long -> start the detector fresh (timers would be stale)
KEEP_ROWS = 50000  # oldest readings are deleted beyond this

SCHEMA = """
CREATE TABLE IF NOT EXISTS readings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ts REAL NOT NULL, wearer TEXT NOT NULL,
    co_left REAL, co_right REAL, so2_left REAL, so2_right REAL,
    o2_left REAL, o2_right REAL, pm25 REAL,
    level INTEGER, fan INTEGER, vibration INTEGER);
CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ts REAL NOT NULL, wearer TEXT NOT NULL, level INTEGER, message TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS idx_readings_wearer ON readings (wearer, id);
CREATE INDEX IF NOT EXISTS idx_events_wearer ON events (wearer, id);
"""


def iso(ts):
    return datetime.fromtimestamp(ts, timezone.utc).isoformat(timespec="seconds")


class Monitor:
    def __init__(self, db_path="pyro.db"):
        self.db_path = db_path
        self.lock = threading.Lock()
        self.detectors = {}  # wearer -> Detector
        self.last = {}  # wearer -> (level, fan) from the previous tick
        self.seen = {}  # wearer -> time of the previous tick
        self.count = 0
        with self._db() as con:
            con.executescript(SCHEMA)

    @contextmanager
    def _db(self):
        con = sqlite3.connect(self.db_path)
        con.row_factory = sqlite3.Row
        try:
            yield con
            con.commit()
        finally:
            con.close()

    # ---- write path -------------------------------------------------------
    def tick(self, wearer, readings, now=None):
        """readings: dict with the 7 FIELDS. Returns the detector result."""
        now = time.time() if now is None else now
        with self.lock:
            if wearer in self.seen and now - self.seen[wearer] > GAP_RESET_S:
                self.detectors.pop(wearer, None)  # stale timers: begin again
            self.seen[wearer] = now
            d = self.detectors.setdefault(wearer, Detector())
            out = d.tick(readings, now)

            prev_level, prev_fan = self.last.get(wearer, (0, False))
            events = []
            if out["level"] != prev_level:
                events.append((out["level"], "Alert level: " + out["name"]))
            if out["fan"] != prev_fan:
                events.append((out["level"], "Fan " + ("ON" if out["fan"] else "OFF")))
            self.last[wearer] = (out["level"], out["fan"])

            self.count += 1
            with self._db() as con:
                con.execute(
                    "INSERT INTO readings (ts, wearer, %s, level, fan, vibration) "
                    "VALUES (?, ?, %s, ?, ?, ?)" % (", ".join(FIELDS), ", ".join("?" * len(FIELDS))),
                    (now, wearer, *[readings[f] for f in FIELDS],
                     out["level"], int(out["fan"]), int(out["vibration"])),
                )
                for lvl, msg in events:
                    con.execute("INSERT INTO events (ts, wearer, level, message) VALUES (?,?,?,?)",
                                (now, wearer, lvl, msg))
                if self.count % 200 == 0:  # keep the file from growing forever
                    con.execute("DELETE FROM readings WHERE id < (SELECT MAX(id) FROM readings) - ?",
                                (KEEP_ROWS,))
            return out

    def reset(self, wearer=None):
        """Forget detector state (not the saved data). Handy before a demo."""
        with self.lock:
            for table in (self.detectors, self.last, self.seen):
                if wearer:
                    table.pop(wearer, None)
                else:
                    table.clear()

    # ---- read path --------------------------------------------------------
    def readings(self, limit=60, wearer=None):
        sql, args = "SELECT * FROM readings", []
        if wearer:
            sql += " WHERE wearer = ?"
            args.append(wearer)
        sql += " ORDER BY id DESC LIMIT ?"
        args.append(limit)
        with self._db() as con:
            rows = con.execute(sql, args).fetchall()
        return [self._row(r) for r in rows]

    def events(self, limit=50, wearer=None):
        sql, args = "SELECT * FROM events", []
        if wearer:
            sql += " WHERE wearer = ?"
            args.append(wearer)
        sql += " ORDER BY id DESC LIMIT ?"
        args.append(limit)
        with self._db() as con:
            rows = con.execute(sql, args).fetchall()
        return [self._row(r) for r in rows]

    def summary(self, wearer=None):
        """Exposure summary for the report: samples per level and the worst readings."""
        where, args = (" WHERE wearer = ?", [wearer]) if wearer else ("", [])
        with self._db() as con:
            n = con.execute("SELECT COUNT(*) FROM readings" + where, args).fetchone()[0]
            levels = con.execute("SELECT level, COUNT(*) c FROM readings" + where + " GROUP BY level", args).fetchall()
            w = con.execute(
                "SELECT MAX(MAX(co_left), MAX(co_right)) co, MAX(MAX(so2_left), MAX(so2_right)) so2, "
                "MIN(MIN(o2_left), MIN(o2_right)) o2_min, MAX(pm25) pm25, MIN(ts) first, MAX(ts) last "
                "FROM readings" + where, args).fetchone()
            ev = con.execute("SELECT COUNT(*) FROM events" + where + (" AND" if wearer else " WHERE") +
                             " level >= 2 AND message LIKE 'Alert level%'", args).fetchone()[0]
        per_level = {NAMES[r["level"]]: r["c"] for r in levels}
        return {
            "samples": n,
            "samples_per_level": {name: per_level.get(name, 0) for name in NAMES},
            "worst": {"co_ppm": w["co"], "so2_ppm": w["so2"], "o2_min_pct": w["o2_min"], "pm25": w["pm25"]},
            "first": iso(w["first"]) if w["first"] else None,
            "last": iso(w["last"]) if w["last"] else None,
            "hazard_alerts": ev,
        }

    def csv_text(self, wearer=None, limit=100000):
        rows = list(reversed(self.readings(limit, wearer)))
        buf = io.StringIO()
        w = csv.writer(buf)
        w.writerow(["time_utc", "wearer"] + FIELDS + ["level", "fan", "vibration"])
        for r in rows:
            w.writerow([r["time"], r["wearer"]] + [r[f] for f in FIELDS] + [r["level"], r["fan"], r["vibration"]])
        return buf.getvalue()

    @staticmethod
    def thresholds():
        return {
            "limits": {k: {"caution": c, "hazard": h} for k, (c, h) in LIMITS.items()},
            "note": "O2 is dangerous when LOW: values are 'below this level'.",
            "timing_s": {
                "confirm_both_sides": det.DWELL_BOTH_S,
                "confirm_one_side": det.DWELL_ONE_S,
                "critical_after_confirmed": det.CRITICAL_AFTER_S,
                "fan_hold_after_clear": det.FAN_HOLDOFF_S,
            },
        }

    @staticmethod
    def _row(r):
        d = dict(r)
        d["time"] = iso(d.pop("ts"))
        if "level" in d:
            d["level_name"] = NAMES[d["level"]] if d["level"] is not None else None
        return d
