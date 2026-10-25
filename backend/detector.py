SAFE, CAUTION, HAZARD, CRITICAL = 0, 1, 2, 3
NAMES = ["SAFE", "CAUTION", "HAZARD", "CRITICAL"]

from thresholds import LIMITS
DWELL_BOTH_S = 2      # both shoulders agree: confirm fast
DWELL_ONE_S = 6       # only one shoulder: slower path
CRITICAL_AFTER_S = 7  # hazard that keeps going becomes critical (guess)
FAN_HOLDOFF_S = 4     # fan stays on this long after hazard clears (guess)


def classify(gas, value):
    caution, hazard = LIMITS[gas]
    if gas == "o2":  # oxygen is dangerous when LOW
        if value < hazard:
            return HAZARD
        if value < caution:
            return CAUTION
        return SAFE
    if value >= hazard:
        return HAZARD
    if value >= caution:
        return CAUTION
    return SAFE


class Detector:
    def __init__(self):
        self._both_since = None
        self._one_since = None
        self._confirmed_since = None
        self._clear_since = None
        self.fan_on = False

    def tick(self, r, now):
        """r: dict with co_left, co_right, so2_left, so2_right,
        o2_left, o2_right, pm25. now: time in seconds."""
        pairs = []
        for gas in ("co", "so2", "o2"):
            pairs.append((classify(gas, r[gas + "_left"]),
                          classify(gas, r[gas + "_right"])))
        pm = classify("pm25", r["pm25"])

        highest = max(max(p) for p in pairs + [(pm, pm)])
        both_hazard = pm >= HAZARD or any(min(p) >= HAZARD for p in pairs)
        # any gas hazard keeps the slow timer running, so the alarm does not
        # drop back to CAUTION when the second shoulder joins (bug fix)
        one_hazard = any(max(p) >= HAZARD for p in pairs)

        # dwell timers: start when the condition begins, reset when it stops
        self._both_since = (self._both_since if self._both_since is not None
                            else now) if both_hazard else None
        self._one_since = (self._one_since if self._one_since is not None
                           else now) if one_hazard else None

        confirmed = (
            (self._both_since is not None
             and now - self._both_since >= DWELL_BOTH_S)
            or (self._one_since is not None
                and now - self._one_since >= DWELL_ONE_S)
        )

        if confirmed:
            if self._confirmed_since is None:
                self._confirmed_since = now
            level = HAZARD
            if now - self._confirmed_since >= CRITICAL_AFTER_S:
                level = CRITICAL
        else:
            self._confirmed_since = None
            level = CAUTION if highest >= CAUTION else SAFE

        # fan: on at hazard, then hold on for a while after it clears
        if level >= HAZARD:
            self.fan_on = True
            self._clear_since = None
        elif self.fan_on:
            if self._clear_since is None:
                self._clear_since = now
            if now - self._clear_since >= FAN_HOLDOFF_S:
                self.fan_on = False

        return {
            "level": level,
            "name": NAMES[level],
            "fan": self.fan_on,
            "vibration": level >= HAZARD,
            "pending": (both_hazard or one_hazard) and not confirmed,
        }
