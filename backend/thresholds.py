# Alert limits for the PYRO-SUIT detector. Each entry is (caution, hazard).
# O2 is dangerous when LOW, so its values are "below this level".
# OSHA/NIOSH limits are 8-hour averages; using them as live alarm
# points is deliberately conservative.

LIMITS = {
    # CO, ppm
    # caution 35 = NIOSH REL (8-h TWA), NIOSH Pocket Guide: Carbon monoxide
    # hazard  50 = OSHA PEL (8-h TWA), 29 CFR 1910.1000 Table Z-1
    # Reference only: NIOSH ceiling 200 ppm, IDLH 1200 ppm
    "co": (35, 50),

    # SO2, ppm
    # caution 2 = NIOSH REL (8-h TWA), NIOSH Pocket Guide: Sulfur dioxide
    # hazard  5 = OSHA PEL (8-h TWA); also the NIOSH short-term limit
    # Reference only: IDLH 100 ppm
    "so2": (2, 5),

    # O2, % by volume (low side)
    # hazard  19.5 = OSHA oxygen-deficient atmosphere, 29 CFR 1910.146(b)
    # caution 20.0 = TEAM DESIGN CHOICE, not a regulatory value
    # Reference only: OSHA oxygen-enriched above 23.5 (not checked yet)
    "o2": (20.0, 19.5),

    # PM2.5, ug/m3
    # caution 35 = EPA 24-h NAAQS (outdoor air standard, not occupational)
    # hazard  75 = TEAM DESIGN CHOICE (no OSHA/NIOSH PM2.5 limit exists)
    "pm25": (35, 75),
}