import os
import datetime
from tinydb import TinyDB, Query

# Resolve DB directory path
DB_DIR = os.path.dirname(os.path.abspath(__file__))
DB_FILE = os.path.join(DB_DIR, "db.json")

# Initialize TinyDB
db = TinyDB(DB_FILE)
users_table = db.table("users")
scans_table = db.table("scans")
insights_table = db.table("insights")

# Seeding initial dashboard MRI activity records and AI insights if they are empty
def seed_database():
    # Seed Scans
    if len(scans_table) == 0:
        initial_scans = [
            {
                "patient_id": "#TX-9042",
                "scan_type": "Cortical Thickness Mapping",
                "status": "PROCESSING",
                "progress": 82,
                "created_at": (datetime.datetime.now() - datetime.timedelta(minutes=15)).isoformat()
            },
            {
                "patient_id": "#TX-8821",
                "scan_type": "Vascular Perfusion Analysis",
                "status": "COMPLETED",
                "progress": 100,
                "created_at": (datetime.datetime.now() - datetime.timedelta(hours=1)).isoformat()
            },
            {
                "patient_id": "#TX-7430",
                "scan_type": "Hippocampal Volumetrics",
                "status": "ACTION REQUIRED",
                "progress": 14,
                "created_at": (datetime.datetime.now() - datetime.timedelta(hours=3)).isoformat()
            },
            {
                "patient_id": "#TX-8911",
                "scan_type": "Functional Connectivity Map",
                "status": "PROCESSING",
                "progress": 45,
                "created_at": (datetime.datetime.now() - datetime.timedelta(hours=4)).isoformat()
            }
        ]
        scans_table.insert_multiple(initial_scans)

    # Seed AI Insights
    if len(insights_table) == 0:
        initial_insights = [
            {
                "type": "ANOMALY DETECTED",
                "message": "Patient #TX-7430 shows unusual atrophy in the posterior cingulate cortex.",
                "time_relative": "2 mins ago",
                "timestamp": (datetime.datetime.now() - datetime.timedelta(minutes=2)).isoformat()
            },
            {
                "type": "TRIAL MILESTONE",
                "message": "Cohort Beta neural mapping dataset is now 95% complete.",
                "time_relative": "1 hour ago",
                "timestamp": (datetime.datetime.now() - datetime.timedelta(hours=1)).isoformat()
            },
            {
                "type": "OPTIMIZATION",
                "message": "Processing speed for volumetric scans improved by 12.4% following node update.",
                "time_relative": "4 hours ago",
                "timestamp": (datetime.datetime.now() - datetime.timedelta(hours=4)).isoformat()
            }
        ]
        insights_table.insert_multiple(initial_insights)

# Run seed on startup/load
seed_database()
