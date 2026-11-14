import heapq
import threading
from typing import List, Optional, Tuple, Dict, Any
from dataclasses import dataclass, field

@dataclass(order=True)
class QueueItem:
    """
    Min-heap item representing a patient waiting in the triage queue.
    heapq sorts primarily by effective_severity (1=Critical is smallest, thus highest priority).
    Ties are broken by arrival_order (smaller arrival_order arrived earlier, ensuring FIFO).
    patient_id is included as unique identifier.
    """
    effective_severity: int
    arrival_order: int
    patient_id: str = field(compare=False)
    original_severity: int = field(compare=False, default=5)
    full_name: str = field(compare=False, default="")
    waiting_minutes: float = field(compare=False, default=0.0)
    arrival_time_str: str = field(compare=False, default="")
    chief_complaint: str = field(compare=False, default="")

    def to_dict(self) -> Dict[str, Any]:
        return {
            "patient_id": self.patient_id,
            "full_name": self.full_name,
            "effective_severity": self.effective_severity,
            "original_severity": self.original_severity,
            "arrival_order": self.arrival_order,
            "waiting_minutes": round(self.waiting_minutes, 1),
            "arrival_time": self.arrival_time_str,
            "chief_complaint": self.chief_complaint,
            "has_aged": self.effective_severity < self.original_severity
        }


class TriagePriorityQueue:
    """
    Binary Min-Heap Priority Queue implementation backed by Python's standard `heapq`.
    Provides guaranteed O(log N) insertion and extraction of highest priority patient,
    and O(1) peek. Thread-safe via internal re-entrant lock.
    """
    def __init__(self):
        self._lock = threading.RLock()
        self._heap: List[QueueItem] = []
        self.operation_count: int = 0
        self.last_operation: str = "INITIALIZED"
        self.last_complexity: str = "O(1)"

    def push(self, item: QueueItem) -> None:
        """
        Inserts a patient into the binary min-heap.
        Time Complexity: O(log N)
        """
        with self._lock:
            heapq.heappush(self._heap, item)
            self.operation_count += 1
            self.last_operation = f"heappush(patient_id='{item.patient_id}', severity={item.effective_severity}, order={item.arrival_order})"
            self.last_complexity = "O(log N)"

    def pop(self) -> Optional[QueueItem]:
        """
        Extracts the highest priority patient from the binary min-heap.
        Time Complexity: O(log N)
        """
        with self._lock:
            if not self._heap:
                self.last_operation = "heappop() [EMPTY_QUEUE]"
                self.last_complexity = "O(1)"
                return None
            
            item = heapq.heappop(self._heap)
            self.operation_count += 1
            self.last_operation = f"heappop() -> {item.patient_id} (Severity {item.effective_severity})"
            self.last_complexity = "O(log N)"
            return item

    def peek(self) -> Optional[QueueItem]:
        """
        Views the highest priority patient at the root of the heap without removal.
        Time Complexity: O(1)
        """
        with self._lock:
            if not self._heap:
                return None
            return self._heap[0]

    def remove(self, patient_id: str) -> bool:
        """
        Removes a specific patient by ID (e.g. if cancelled/transferred) and restores heap property.
        Time Complexity: O(N) due to linear search and heapify.
        """
        with self._lock:
            initial_len = len(self._heap)
            self._heap = [item for item in self._heap if item.patient_id != patient_id]
            if len(self._heap) < initial_len:
                heapq.heapify(self._heap)
                self.operation_count += 1
                self.last_operation = f"remove('{patient_id}') + heapify()"
                self.last_complexity = "O(N)"
                return True
            return False

    def rebuild(self, items: List[QueueItem]) -> None:
        """
        Rebuilds the entire heap in-place from an updated list of QueueItems.
        Used after priority aging sweeps across all waiting patients.
        Time Complexity: O(N) via linear-time heapify.
        """
        with self._lock:
            self._heap = list(items)
            heapq.heapify(self._heap)
            self.operation_count += 1
            self.last_operation = f"rebuild(heapify {len(self._heap)} patients after aging)"
            self.last_complexity = "O(N) heapify"

    def get_ordered_queue(self) -> List[Dict[str, Any]]:
        """
        Returns a sorted copy of the queue items in triage processing order
        (Position 1 = Next to be called) without mutating the internal heap array.
        Time Complexity: O(N log N)
        """
        with self._lock:
            sorted_items = sorted(self._heap)
            result = []
            for rank, item in enumerate(sorted_items, start=1):
                d = item.to_dict()
                d["position"] = rank
                result.append(d)
            return result

    def size(self) -> int:
        with self._lock:
            return len(self._heap)

    def is_empty(self) -> bool:
        with self._lock:
            return len(self._heap) == 0

    def clear(self) -> None:
        with self._lock:
            self._heap.clear()
            self.last_operation = "clear()"
            self.last_complexity = "O(1)"

    def get_telemetry(self) -> Dict[str, Any]:
        """
        Returns telemetry metadata specifically formatted for the DSA Information Panel.
        """
        with self._lock:
            highest = self.peek()
            return {
                "active_structure": "Binary Min-Heap (Python heapq)",
                "queue_size": len(self._heap),
                "operation_count": self.operation_count,
                "last_operation": self.last_operation,
                "last_complexity": self.last_complexity,
                "highest_priority_patient_id": highest.patient_id if highest else None,
                "highest_priority_severity": highest.effective_severity if highest else None,
                "time_complexities": {
                    "insert (push)": "O(log N)",
                    "extract-min (pop)": "O(log N)",
                    "peek (find-min)": "O(1)",
                    "aging rebuild (heapify)": "O(N)"
                }
            }
