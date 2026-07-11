"""
clear_all_uploads.py
--------------------
One-time script to wipe ALL upload records, scans, and insights from
the TinyDB database so you can start fresh.

Patients are PRESERVED. Only MRI upload records and AI scan data are cleared.

Usage (from backend/ folder with venv active):
    python clear_all_uploads.py
"""

import os
import sys

# Make sure we can import the app
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import database

def clear_all():
    uploads_count = len(database.uploads_table)
    scans_count   = len(database.scans_table)
    insights_count = len(database.insights_table)

    database.uploads_table.truncate()
    database.scans_table.truncate()
    database.insights_table.truncate()

    # Reset scan_count to 0 on all patients
    all_patients = database.patients_table.all()
    for p in all_patients:
        database.patients_table.update({'scan_count': 0}, database.Query().id == p['id'])

    print(f"[CLEARED] Uploads:  {uploads_count} records deleted")
    print(f"[CLEARED] Scans:    {scans_count} records deleted")
    print(f"[CLEARED] Insights: {insights_count} records deleted")
    print(f"[RESET]   scan_count reset to 0 for {len(all_patients)} patient(s)")
    print()
    print("Database is now clean. You can start fresh uploads.")

if __name__ == "__main__":
    clear_all()
