"""Compare two existing, same-workload benchmark JSON manifests once.

Read-only. No benchmarks are executed; output is JSON on stdout.
"""

import argparse
import json
import math
import statistics
from pathlib import Path

SCHEMA = "hex-performance-samples/1"
MAX_SAMPLES_PER_METRIC = 10_000
MAX_INPUT_BYTES = 2_000_000


class InvalidManifest(ValueError):
    """A manifest does not meet the declared finite comparison schema."""


def read_manifest(path):
    path = Path(path)
    if path.stat().st_size > MAX_INPUT_BYTES:
        raise InvalidManifest(f"Input exceeds {MAX_INPUT_BYTES} bytes: {path}")
    with path.open("r", encoding="utf-8") as handle:
        doc = json.load(handle)
    if not isinstance(doc, dict) or doc.get("schema") != SCHEMA:
        raise InvalidManifest(f"Expected schema {SCHEMA}: {path}")
    if not isinstance(doc.get("scenario"), str) or not doc["scenario"].strip():
        raise InvalidManifest(f"Missing scenario: {path}")
    env = doc.get("environment")
    if not isinstance(env, dict) or not env or any(not isinstance(k, str) for k in env):
        raise InvalidManifest(f"Missing environment record: {path}")
    if not all(isinstance(v, (str, int, float, bool)) and not (isinstance(v, float) and not math.isfinite(v)) for v in env.values()):
        raise InvalidManifest(f"Environment values must be finite scalars: {path}")

    metrics = doc.get("metrics")
    if not isinstance(metrics, dict) or not metrics:
        raise InvalidManifest(f"Missing metrics: {path}")
    for name, item in metrics.items():
        if not isinstance(name, str) or not name or not isinstance(item, dict):
            raise InvalidManifest(f"Invalid metric entry: {name!r}")
        if not isinstance(item.get("unit"), str) or not item["unit"]:
            raise InvalidManifest(f"Missing unit for {name}")
        if item.get("direction") not in ("lower", "higher"):
            raise InvalidManifest(f"Invalid direction for {name}")
        samples = item.get("samples")
        if not isinstance(samples, list) or not 1 <= len(samples) <= MAX_SAMPLES_PER_METRIC:
            raise InvalidManifest(f"Invalid sample count for {name}")
        for v in samples:
            if isinstance(v, bool) or not isinstance(v, (int, float)) or not math.isfinite(v) or v < 0:
                raise InvalidManifest(f"Samples must be finite, nonnegative numbers: {name}")
    return doc


def quantile_nearest_rank(values, proportion):
    values = sorted(values)
    return values[max(0, math.ceil(len(values) * proportion) - 1)]


def summary(values, direction):
    return {
        "count": len(values),
        "p05": quantile_nearest_rank(values, 0.05),
        "p50": statistics.median(values),
        "p95": quantile_nearest_rank(values, 0.95),
        "min": min(values),
        "max": max(values),
        "worst_observed": max(values) if direction == "lower" else min(values),
    }


def compare(baseline, candidate):
    mismatches = []
    if baseline["scenario"] != candidate["scenario"]:
        mismatches.append("scenario differs")
    if baseline["environment"] != candidate["environment"]:
        mismatches.append("environment differs")
    if set(baseline["metrics"]) != set(candidate["metrics"]):
        mismatches.append("metric names differ")
    common = set(baseline["metrics"]) & set(candidate["metrics"])
    for name in sorted(common):
        for key in ("unit", "direction"):
            if baseline["metrics"][name][key] != candidate["metrics"][name][key]:
                mismatches.append(f"metric {name}: {key} differs")
    if mismatches:
        return {"status": "NOT_COMPARABLE", "reasons": mismatches, "metrics": {}}

    results = {}
    for name in sorted(baseline["metrics"]):
        a, b = baseline["metrics"][name], candidate["metrics"][name]
        old, new = summary(a["samples"], a["direction"]), summary(b["samples"], b["direction"])
        pct = ((new["p50"] - old["p50"]) / old["p50"] * 100.0) if old["p50"] != 0 else None
        results[name] = {
            "unit": a["unit"],
            "preferred_direction": a["direction"],
            "baseline": old,
            "candidate": new,
            "median_change_pct": pct,
        }
    return {
        "status": "COMPARABLE_NUMERIC_ONLY",
        "scenario": baseline["scenario"],
        "environment": baseline["environment"],
        "metrics": results,
        "limitations": "No significance test, quality gate, or correctness check; inputs are assumed to be truthfully measured.",
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--baseline", required=True, type=Path)
    parser.add_argument("--candidate", required=True, type=Path)
    args = parser.parse_args()
    try:
        result = compare(read_manifest(args.baseline), read_manifest(args.candidate))
    except (OSError, ValueError, json.JSONDecodeError) as exc:
        parser.exit(2, f"Invalid benchmark input: {exc}\n")
    print(json.dumps(result, indent=2, ensure_ascii=False, allow_nan=False))
    if result["status"] == "NOT_COMPARABLE":
        raise SystemExit(2)


if __name__ == "__main__":
    main()
