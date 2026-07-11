import os
import datetime
from tinydb import TinyDB, Query

# Resolve DB directory path
DB_DIR = os.path.dirname(os.path.abspath(__file__))
DB_FILE = os.path.join(DB_DIR, "db.json")

# Initialize TinyDB
db = TinyDB(DB_FILE)
users_table   = db.table("users")
scans_table   = db.table("scans")
insights_table = db.table("insights")
uploads_table  = db.table("uploads")   # Stores real MRI upload + AI segmentation records
patients_table = db.table("patients")
reports_table  = db.table("reports")

# No auto-seeding — all patient/upload data is managed exclusively through the API.
# This prevents deleted records from reappearing on server restart.
