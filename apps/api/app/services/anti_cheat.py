"""Cheat-detection validator (backend-spec.md §5).

Pure functions with no I/O so they are trivially unit-testable and reusable by a
future DB-backed router unchanged.
"""

from __future__ import annotations

from dataclasses import dataclass

from app.config import settings
from app.store import Line


@dataclass
class ValidationResult:
    ok: bool
    error_code: str | None = None


def validate_run(line: Line, duration_ms: int, keystrokes: int, accuracy: float) -> ValidationResult:
    duration_sec = duration_ms / 1000
    if duration_sec <= 0:
        return ValidationResult(False, "invalid_duration")

    if not (0.0 <= accuracy <= 1.0):
        return ValidationResult(False, "invalid_accuracy")

    keystrokes_per_sec = keystrokes / duration_sec
    if keystrokes_per_sec > settings.max_keystrokes_per_sec:
        return ValidationResult(False, "keystroke_rate_exceeded")

    # Theoretical minimum time (sec) for the line's total characters, with 10% slack.
    theoretical_min_sec = line.total_chars / settings.max_keystrokes_per_sec
    if duration_sec < theoretical_min_sec * 0.9:
        return ValidationResult(False, "duration_below_theoretical_minimum")

    return ValidationResult(True)


def validate_timing(
    duration_ms: int, elapsed_ms: float, tolerance_ms: int | None = None
) -> ValidationResult:
    """Reject claimed durations longer than the server-observed run window.

    The run_token exists so the server controls timing (backend-spec.md §4.2/§5):
    `elapsed_ms` is the time between token issuance (/runs/start) and submission
    (/runs/complete). A client cannot have played longer than that window, so a
    `duration_ms` exceeding it (plus a latency/clock-skew tolerance) is fabricated
    — e.g. submitting a plausible-looking 45s record 1s after starting.

    The opposite direction (elapsed >> duration) is NOT rejected: pauses/tab
    switches make it legitimate, and the keystroke-rate cap already bounds the
    achievable wpm from a shortened duration claim.
    """
    limit = settings.run_duration_tolerance_ms if tolerance_ms is None else tolerance_ms
    if duration_ms > elapsed_ms + limit:
        return ValidationResult(False, "duration_exceeds_elapsed")
    return ValidationResult(True)


def should_flag_for_review(wpm: float, line_top_wpm: float) -> bool:
    """Top-entering records (>=110% of the current #1) go to the review queue."""
    return wpm > line_top_wpm * 1.10
