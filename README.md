# StatQ: Emergency Room Triage Queue & Patient Record Management System

**StatQ** is a modern, clinical-grade Emergency Room (ER) triage simulation web application built for a college **Data Structures and Algorithms (DSA)** curriculum. It balances an authentic healthcare SaaS interface with real, transparent data structure implementations operating under the hood.

---

## 🏥 Clinical Workflow Overview

1. **Patient Registration / Triage Intake**: A patient arrives at the emergency department. Front desk staff record demographics and clinical triage nurses assign an initial acuity score from **Level 1 (Critical)** to **Level 5 (Minor)**.
2. **Priority Queue Insertion**: The patient is placed into the live triage queue backed by a **Binary Min-Heap** (`heapq`).
3. **Prioritization Rules**:
   - **Primary Key**: Acuity Severity Level (Level 1 is minimum key, extracted first).
   - **Secondary Key**: Monotonic arrival sequence order (FIFO tie-breaking for equal acuities).
4. **Priority Aging Mechanism**: To prevent starvation of lower-acuity patients waiting for extended durations, an aging algorithm evaluates waiting time and improves effective acuity by 1 level for every configurable interval (default: 5 simulated minutes) until reaching Level 1.
5. **Call Next Patient**: When an emergency treatment bay becomes available, staff can call the next patient. The backend executes `heapq.heappop()` in $O(\log N)$ time, validates room availability, assigns the patient to the room, and broadcasts updates in real-time via WebSockets.
6. **Room & Encounter Management**: Staff monitor bay occupancy, record physician notes, and conclude treatments to discharge patients, archiving records in SQLite and releasing bays for incoming patients.
7. **Simulation Center ("Busy Day Simulation")**: Interactive simulation controls enable stress-testing ER rushes, generating batch patient arrivals with realistic clinical complaints, advancing time, and demonstrating automatic heap reorganization.

---

## 🧠 Data Structures & Algorithms Implementation

| Data Structure / Algorithm | Implementation | Time Complexity | Academic Purpose & Real-World Justification |
| :--- | :--- | :--- | :--- |
| **Priority Queue** | Python `heapq` (Binary Min-Heap) | **$O(\log N)$** Push<br>**$O(\log N)$** Pop<br>**$O(1)$** Peek | Live emergency triage ordering. Ensures patients with critical life threats are attended to immediately before lower acuity cases. Avoids the $O(N)$ insertion cost of naive sorted arrays. |
| **Tie-Breaking Rule** | Monotonic Arrival Counter (`arrival_order`) | **$O(1)$** comparison | Preserves strict **FIFO** fairness for patients arriving with identical severity scores. |
| **Priority Aging** | Periodic Acuity Escalation + `heapq.heapify()` | **$O(N)$** Rebuild | Prevents indefinite starvation of Level 4/5 patients during busy surges by improving effective priority as waiting time accumulates. |
| **Patient Record Store** | In-Memory Hash Map (`dict`) + SQLite | **$O(1)$** Average Lookup | Rapid direct record retrieval by unique Patient ID (`PT-XXXX`) without incurring repeated disk database I/O penalties. |
| **Name Search** | Case-Insensitive Linear Scan | **$O(N)$** Search | Substring matching across patient directory with live comparison counters shown in telemetry for algorithmic comparison. |

---

## 🛠️ Technology Stack

### Backend
- **Python 3.14**
- **FastAPI**: Asynchronous REST API and WebSocket gateway
- **SQLAlchemy 2.0**: Relational ORM mapped to persistent SQLite (`statq.db`)
- **Pydantic v2**: Type contracts and strict request validation
- **WebSockets**: Real-time broadcast channel
- **Pytest**: Automated backend test suite

### Frontend
- **React 19** with **Vite 6**
- **Tailwind CSS v4**: Healthcare design system styled after modern clinical SaaS applications
- **Lucide React**: Medical and administrative iconography
- **Recharts**: Patient acuity distributions and ER throughput analytics

---

## 🚀 Running the Application

### 1. Prerequisites
- Python 3.10+ installed
- Node.js 18+ and npm installed

### 2. Backend Setup
```bash
# In the project root:
uv venv .venv
# Or: python -m venv .venv

# Activate environment:
# Windows:
.venv\Scripts\activate
# Linux/macOS:
source .venv/bin/activate

# Install dependencies:
pip install -r backend/requirements.txt

# Start FastAPI server:
python -m uvicorn backend.app.main:app --port 8000 --reload
```
The backend will be live at `http://127.0.0.1:8000`. Interactive OpenAPI documentation is available at `http://127.0.0.1:8000/docs`.

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
The frontend will be live at `http://127.0.0.1:5173`.

---

## 🧪 Running Automated Tests

Run the full automated test suite verifying Min-Heap priority ordering, FIFO tie-breaking, aging, hash map retrieval, and API endpoints:

```bash
pytest -v
```

All 10 test suites pass with 100% assertions:
- `test_priority_queue_ordering`
- `test_peek_and_remove`
- `test_priority_aging_mechanism`
- `test_hash_map`
- `test_root_endpoint`
- `test_patient_registration_and_priority_queue`
- `test_hash_map_lookup`
- `test_call_next_patient_and_rooms`
- `test_simulation_advance_time_and_aging`
- `test_dsa_telemetry`
