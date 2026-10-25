from detector import Detector


def reading(**changes):
    r = dict(co_left=3, co_right=3, so2_left=0.3, so2_right=0.3,
             o2_left=20.9, o2_right=20.9, pm25=13)
    r.update(changes)
    return r


# Each scenario: a name, and a function that gives the readings at second t.
def burst(t):      # both shoulders see gas from second 2 to 13
    if 2 <= t < 14:
        return reading(co_left=60, co_right=60, so2_left=5.2,
                       so2_right=5.2, pm25=100)
    return reading()


def left_only(t):  # only the left shoulder sees gas from second 2 to 15
    return reading(co_left=60) if 2 <= t < 16 else reading()


def glitch(t):     # a one-second spike at second 3
    return reading(co_left=60, co_right=60) if t == 3 else reading()


SCENARIOS = {
    "1": ("Firework burst (both shoulders)", burst),
    "2": ("Left-side source only", left_only),
    "3": ("Sensor glitch (1-second spike)", glitch),
}

print("Pick a scenario:")
for key, (name, _) in SCENARIOS.items():
    print(f"  {key}. {name}")
choice = input("Number: ").strip()

name, source = SCENARIOS[choice]
d = Detector()
print(f"\n{name}")
print("sec  CO-left  CO-right  level     fan  vibration  confirming")
for t in range(0, 26):
    r = source(t)
    out = d.tick(r, t)
    print(f"{t:>3}  {r['co_left']:>7}  {r['co_right']:>8}  {out['name']:<8}  "
          f"{'ON ' if out['fan'] else 'off'}  "
          f"{'ON ' if out['vibration'] else 'off'}        "
          f"{'waiting' if out['pending'] else ''}")