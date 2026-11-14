import datetime
from backend.app.algorithms.priority_queue import TriagePriorityQueue
from backend.app.algorithms.hash_map import PatientHashMap
from backend.app.algorithms.aging import PriorityAgingSystem

class SystemState:
    def __init__(self):
        self.priority_queue = TriagePriorityQueue()
        self.patient_hash_map = PatientHashMap()
        self.aging_system = PriorityAgingSystem(interval_minutes=5.0)
        self.arrival_counter: int = 1000
        self.simulated_minutes_elapsed: float = 0.0
        self.simulated_clock = datetime.datetime.now()
        self.is_simulation_running: bool = False
        self.auto_advance_interval_seconds: int = 5
        self.hospital_name: str = "MetroHealth Emergency Center"
        self.initialized: bool = False

system_state = SystemState()
