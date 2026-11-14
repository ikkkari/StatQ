from typing import Tuple, Dict, Any

class PriorityAgingSystem:
    """
    Priority Aging Mechanism.
    Prevents starvation of lower-acuity emergency room patients.
    Every `interval_minutes` (default 5.0) of accumulated waiting time,
    the patient's effective severity level improves by 1 (e.g., Level 5 -> Level 4 -> ... -> Level 1).
    Level 1 is maximum acuity (Critical) and cannot be improved further.
    """
    def __init__(self, interval_minutes: float = 5.0):
        self.interval_minutes = max(1.0, float(interval_minutes))

    def set_interval(self, interval_minutes: float) -> None:
        self.interval_minutes = max(1.0, float(interval_minutes))

    def calculate_effective_severity(
        self, original_severity: int, waiting_minutes: float
    ) -> Tuple[int, int, float]:
        """
        Calculates:
        1. effective_severity (1..5)
        2. levels_improved (0..4)
        3. minutes_until_next_upgrade (float, 0 if already level 1)
        """
        orig = max(1, min(5, int(original_severity)))
        wait = max(0.0, float(waiting_minutes))

        if orig == 1:
            return 1, 0, 0.0

        levels_improved = int(wait // self.interval_minutes)
        effective = max(1, orig - levels_improved)
        actual_improved = orig - effective

        if effective == 1:
            minutes_until_next = 0.0
        else:
            next_upgrade_time = (actual_improved + 1) * self.interval_minutes
            minutes_until_next = round(max(0.0, next_upgrade_time - wait), 1)

        return effective, actual_improved, minutes_until_next

    def get_aging_details(self, original_severity: int, waiting_minutes: float) -> Dict[str, Any]:
        effective, improved, next_upgrade = self.calculate_effective_severity(
            original_severity, waiting_minutes
        )
        return {
            "original_severity": original_severity,
            "effective_severity": effective,
            "has_aged": effective < original_severity,
            "levels_escalated": improved,
            "waiting_minutes": round(waiting_minutes, 1),
            "aging_interval_minutes": self.interval_minutes,
            "minutes_until_next_escalation": next_upgrade
        }
