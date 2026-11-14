import time
from typing import Dict, Any, Optional, List, Tuple

class PatientHashMap:
    """
    In-memory Hash Map (dictionary) for patient records.
    Provides average O(1) time complexity for record lookups, insertions, and updates by patient_id.
    Also provides a linear search algorithm for name-based queries with comparison tracking.
    """
    def __init__(self):
        self._store: Dict[str, Dict[str, Any]] = {}
        self.lookup_count: int = 0
        self.last_lookup_type: str = "INITIALIZED"
        self.last_lookup_key: str = ""
        self.last_lookup_time_ms: float = 0.0
        self.last_complexity: str = "O(1)"

    def set(self, patient_id: str, record: Dict[str, Any]) -> None:
        """
        Stores or updates a patient record.
        Time Complexity: O(1) average.
        """
        self._store[patient_id] = record

    def get(self, patient_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieves a patient record by ID using direct hash lookup.
        Time Complexity: O(1) average.
        """
        t0 = time.perf_counter()
        self.lookup_count += 1
        record = self._store.get(patient_id)
        elapsed_ms = (time.perf_counter() - t0) * 1000.0

        self.last_lookup_type = "HASH_MAP_LOOKUP"
        self.last_lookup_key = patient_id
        self.last_lookup_time_ms = round(elapsed_ms, 4)
        self.last_complexity = "O(1) average"
        return record

    def delete(self, patient_id: str) -> bool:
        """
        Deletes a patient record from the hash map.
        Time Complexity: O(1) average.
        """
        if patient_id in self._store:
            del self._store[patient_id]
            return True
        return False

    def contains(self, patient_id: str) -> bool:
        return patient_id in self._store

    def all_records(self) -> List[Dict[str, Any]]:
        return list(self._store.values())

    def size(self) -> int:
        return len(self._store)

    def clear(self) -> None:
        self._store.clear()

    def linear_search_by_name(self, query: str) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        """
        Searches records by patient full_name using Linear Search.
        Case-insensitive match.
        Tracks comparisons and time to demonstrate O(N) linear search vs O(1) hash map lookup.
        """
        t0 = time.perf_counter()
        q = query.strip().lower()
        results = []
        comparisons = 0

        for record in self._store.values():
            comparisons += 1
            name = record.get("full_name", "").lower()
            if q in name:
                results.append(record)

        elapsed_ms = (time.perf_counter() - t0) * 1000.0

        self.last_lookup_type = "LINEAR_SEARCH_NAME"
        self.last_lookup_key = query
        self.last_lookup_time_ms = round(elapsed_ms, 4)
        self.last_complexity = f"O(N) with {comparisons} checks"

        meta = {
            "query": query,
            "algorithm": "Linear Search",
            "comparisons": comparisons,
            "total_records": len(self._store),
            "time_ms": round(elapsed_ms, 4),
            "complexity": "O(N)"
        }
        return results, meta

    def get_telemetry(self) -> Dict[str, Any]:
        return {
            "active_structure": "Hash Map (Python dict)",
            "total_records": len(self._store),
            "lookup_count": self.lookup_count,
            "last_lookup_type": self.last_lookup_type,
            "last_lookup_key": self.last_lookup_key,
            "last_lookup_time_ms": self.last_lookup_time_ms,
            "last_complexity": self.last_complexity,
            "time_complexities": {
                "patient_id lookup": "O(1) average",
                "patient_id insert/update": "O(1) average",
                "name search (linear)": "O(N)"
            }
        }
