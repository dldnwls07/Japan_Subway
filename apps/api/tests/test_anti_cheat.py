"""Unit tests for the anti-cheat validator (backend-spec.md §9)."""

from app.services.anti_cheat import should_flag_for_review, validate_run
from app.store import Line


def make_line(total_chars: int = 120) -> Line:
    return Line(id="test-line", name_ko="테스트선", station_count=10, total_chars=total_chars)


def test_rejects_impossible_keystroke_rate() -> None:
    result = validate_run(make_line(), duration_ms=1000, keystrokes=500, accuracy=1.0)
    assert not result.ok
    assert result.error_code == "keystroke_rate_exceeded"


def test_accepts_realistic_run() -> None:
    result = validate_run(make_line(total_chars=120), duration_ms=15000, keystrokes=120, accuracy=0.95)
    assert result.ok


def test_rejects_zero_duration() -> None:
    result = validate_run(make_line(), duration_ms=0, keystrokes=1, accuracy=1.0)
    assert not result.ok
    assert result.error_code == "invalid_duration"


def test_rejects_out_of_range_accuracy() -> None:
    result = validate_run(make_line(), duration_ms=15000, keystrokes=100, accuracy=1.5)
    assert not result.ok
    assert result.error_code == "invalid_accuracy"


def test_rejects_duration_below_theoretical_minimum() -> None:
    # total_chars 600 at 20 keys/sec -> ~30s theoretical minimum; 5s is impossible.
    result = validate_run(make_line(total_chars=600), duration_ms=5000, keystrokes=100, accuracy=1.0)
    assert not result.ok
    assert result.error_code == "duration_below_theoretical_minimum"


def test_should_flag_for_review() -> None:
    assert should_flag_for_review(wpm=120.0, line_top_wpm=100.0) is True
    assert should_flag_for_review(wpm=105.0, line_top_wpm=100.0) is False
