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


def should_flag_for_review(wpm: float, line_top_wpm: float) -> bool:
    """Top-entering records (>=110% of the current #1) go to the review queue."""
    return wpm > line_top_wpm * 1.10
