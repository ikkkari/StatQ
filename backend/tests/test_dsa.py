import pytest
from backend.app.algorithms.priority_queue import TriagePriorityQueue, QueueItem
from backend.app.algorithms.hash_map import PatientHashMap
from backend.app.algorithms.aging import PriorityAgingSystem

def test_priority_queue_ordering():
    """
    Test requirement:
    Patient A: Severity 3
    Patient B: Severity 1 (arrived first among level 1)
    Patient C: Severity 2
    Patient D: Severity 1 (arrived second among level 1)

    Expected processing order:
    1. Patient B
    2. Patient D
    3. Patient C
    4. Patient A
    """
    pq = TriagePriorityQueue()

    pq.push(QueueItem(effective_severity=3, arrival_order=1, patient_id="PT-A", full_name="Patient A"))
    pq.push(QueueItem(effective_severity=1, arrival_order=2, patient_id="PT-B", full_name="Patient B"))
    pq.push(QueueItem(effective_severity=2, arrival_order=3, patient_id="PT-C", full_name="Patient C"))
    pq.push(QueueItem(effective_severity=1, arrival_order=4, patient_id="PT-D", full_name="Patient D"))

    assert pq.size() == 4

    p1 = pq.pop()
    assert p1.patient_id == "PT-B"
    assert p1.effective_severity == 1

    p2 = pq.pop()
    assert p2.patient_id == "PT-D"
    assert p2.effective_severity == 1

    p3 = pq.pop()
    assert p3.patient_id == "PT-C"
    assert p3.effective_severity == 2

    p4 = pq.pop()
    assert p4.patient_id == "PT-A"
    assert p4.effective_severity == 3

    assert pq.is_empty()
    assert pq.pop() is None

def test_peek_and_remove():
    pq = TriagePriorityQueue()
    pq.push(QueueItem(effective_severity=4, arrival_order=1, patient_id="PT-1"))
    pq.push(QueueItem(effective_severity=2, arrival_order=2, patient_id="PT-2"))
    pq.push(QueueItem(effective_severity=5, arrival_order=3, patient_id="PT-3"))

    assert pq.peek().patient_id == "PT-2"
    assert pq.size() == 3

    # Remove PT-2
    removed = pq.remove("PT-2")
    assert removed is True
    assert pq.size() == 2
    assert pq.peek().patient_id == "PT-1"

    # Remove non-existent
    assert pq.remove("PT-UNKNOWN") is False

def test_priority_aging_mechanism():
    aging = PriorityAgingSystem(interval_minutes=5.0)

    # Level 5 original
    # At 0 min: 5
    eff, imp, next_up = aging.calculate_effective_severity(5, 0.0)
    assert eff == 5
    assert imp == 0
    assert next_up == 5.0

    # At 4.9 min: still 5
    eff, imp, next_up = aging.calculate_effective_severity(5, 4.9)
    assert eff == 5
    assert imp == 0
    assert next_up == 0.1

    # At 5.0 min: upgrades to 4
    eff, imp, next_up = aging.calculate_effective_severity(5, 5.0)
    assert eff == 4
    assert imp == 1
    assert next_up == 5.0

    # At 10.0 min: upgrades to 3
    eff, imp, next_up = aging.calculate_effective_severity(5, 10.0)
    assert eff == 3
    assert imp == 2
    assert next_up == 5.0

    # At 25.0 min: upgrades to 1 (capped at 1)
    eff, imp, next_up = aging.calculate_effective_severity(5, 25.0)
    assert eff == 1
    assert imp == 4
    assert next_up == 0.0

    # Level 1 patient never degrades or improves past 1
    eff, imp, next_up = aging.calculate_effective_severity(1, 100.0)
    assert eff == 1
    assert imp == 0
    assert next_up == 0.0

def test_hash_map():
    hm = PatientHashMap()
    rec1 = {"id": "PT-100", "full_name": "Eleanor Vance", "severity": 2}
    rec2 = {"id": "PT-101", "full_name": "Liam Vance", "severity": 4}
    rec3 = {"id": "PT-102", "full_name": "Sophia Chen", "severity": 1}

    hm.set("PT-100", rec1)
    hm.set("PT-101", rec2)
    hm.set("PT-102", rec3)

    assert hm.size() == 3
    assert hm.contains("PT-100")
    assert hm.get("PT-100")["full_name"] == "Eleanor Vance"
    assert hm.get("PT-999") is None

    # Linear search by name
    results, meta = hm.linear_search_by_name("vance")
    assert len(results) == 2
    assert meta["comparisons"] == 3
    assert meta["complexity"] == "O(N)"

    # Delete
    assert hm.delete("PT-100") is True
    assert hm.get("PT-100") is None
    assert hm.size() == 2
