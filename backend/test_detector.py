from detector import Detector, SAFE, CAUTION, HAZARD, CRITICAL


def reading(**changes):
    """A normal, safe reading. Pass values to change, e.g. co_left=60."""
    r = dict(co_left=3, co_right=3, so2_left=0.3, so2_right=0.3,
             o2_left=20.9, o2_right=20.9, pm25=13)
    r.update(changes)
    return r


def test_glitch_on_both_shoulders_is_ignored():
    d = Detector()
    first = d.tick(reading(co_left=60, co_right=60), 0)  # 1-second spike
    assert first["level"] == CAUTION and first["pending"]
    for t in range(1, 11):                                # back to normal
        out = d.tick(reading(), t)
        assert out["level"] == SAFE
        assert out["fan"] is False


def test_single_shoulder_glitch_is_ignored():
    d = Detector()
    assert d.tick(reading(co_left=60), 0)["level"] == CAUTION
    for t in range(1, 11):
        assert d.tick(reading(), t)["level"] == SAFE


def test_sustained_burst_escalates():
    d = Detector()
    r = reading(co_left=60, co_right=60)
    assert d.tick(r, 0)["level"] == CAUTION   # waiting to confirm
    assert d.tick(r, 1)["level"] == CAUTION
    out = d.tick(r, 2)                         # confirmed after 2 s
    assert out["level"] == HAZARD
    assert out["fan"] is True and out["vibration"] is True
    for t in range(3, 9):
        out = d.tick(r, t)
    assert out["level"] == HAZARD              # still hazard at 8 s
    assert d.tick(r, 9)["level"] == CRITICAL   # critical after 7 s more


def test_left_only_source_takes_slower_path():
    both, left = Detector(), Detector()
    r_both = reading(co_left=60, co_right=60)
    r_left = reading(co_left=60)
    for t in range(0, 6):
        b = both.tick(r_both, t)
        l = left.tick(r_left, t)
        if t >= 2:
            assert b["level"] >= HAZARD        # both shoulders: fast
        assert l["level"] == CAUTION           # left only: still waiting
    assert left.tick(r_left, 6)["level"] == HAZARD  # confirmed at 6 s


def test_fan_stays_on_after_hazard_clears():
    d = Detector()
    bad = reading(co_left=60, co_right=60)
    for t in range(0, 3):
        d.tick(bad, t)
    assert d.tick(reading(), 3)["fan"] is True   # hazard gone, fan holds
    assert d.tick(reading(), 6)["fan"] is True   # 3 s later, still on
    assert d.tick(reading(), 7)["fan"] is False  # 4 s later, off


def test_low_oxygen_is_hazard():
    d = Detector()
    r = reading(o2_left=17.0, o2_right=17.0)
    d.tick(r, 0)
    d.tick(r, 1)
    assert d.tick(r, 2)["level"] == HAZARD

def test_alarm_does_not_drop_when_second_shoulder_joins():
    d = Detector()
    left = reading(co_left=60)
    for t in range(0, 7):
        d.tick(left, t)
    assert d.tick(left, 6)["level"] == HAZARD          # confirmed on one side
    both = reading(co_left=60, co_right=60)
    for t in range(7, 12):
        assert d.tick(both, t)["level"] >= HAZARD      # must never fall back
