import os
import tempfile

from service import Monitor


def reading(**c):
    r = dict(co_left=3, co_right=3, so2_left=0.3, so2_right=0.3, o2_left=20.9, o2_right=20.9, pm25=13)
    r.update(c)
    return r


def new_monitor():
    return Monitor(os.path.join(tempfile.mkdtemp(), "t.db"))


def test_burst_is_stored_and_logged():
    m = new_monitor()
    for t in range(12):
        out = m.tick("W01", reading(co_left=60, co_right=60), now=1000 + t)
    assert out["name"] == "CRITICAL" or out["name"] == "HAZARD"
    assert len(m.readings(100)) == 12
    msgs = [e["message"] for e in m.events(20)]
    assert "Alert level: HAZARD" in msgs and "Fan ON" in msgs


def test_glitch_is_stored_but_raises_no_hazard_event():
    m = new_monitor()
    m.tick("W01", reading(co_left=60, co_right=60), now=1000)
    for t in range(1, 8):
        m.tick("W01", reading(), now=1000 + t)
    assert not [e for e in m.events(20) if "HAZARD" in e["message"]]


def test_wearers_are_independent():
    m = new_monitor()
    for t in range(4):
        m.tick("A", reading(co_left=60, co_right=60), now=1000 + t)
        out_b = m.tick("B", reading(), now=1000 + t)
    assert out_b["name"] == "SAFE"
    assert len(m.readings(50, "A")) == 4 and len(m.readings(50, "B")) == 4


def test_gap_in_data_resets_the_timers():
    m = new_monitor()
    m.tick("W01", reading(co_left=60, co_right=60), now=1000)
    out = m.tick("W01", reading(co_left=60, co_right=60), now=1100)  # long silence
    assert out["name"] == "CAUTION"  # starts counting again, not an instant hazard


def test_summary_and_csv():
    m = new_monitor()
    for t in range(5):
        m.tick("W01", reading(co_left=80, co_right=75, o2_left=19.0), now=1000 + t)
    s = m.summary()
    assert s["samples"] == 5 and s["worst"]["co_ppm"] == 80 and s["worst"]["o2_min_pct"] == 19.0
    assert s["hazard_alerts"] >= 1
    lines = m.csv_text().strip().splitlines()
    assert len(lines) == 6 and lines[0].startswith("time_utc,wearer,co_left")


def test_thresholds_come_from_thresholds_py():
    t = new_monitor().thresholds()
    assert t["limits"]["co"] == {"caution": 35, "hazard": 50}
    assert t["timing_s"]["confirm_both_sides"] == 2
