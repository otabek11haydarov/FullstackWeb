import psycopg2
import uuid
import random
from datetime import datetime, timedelta

# Database connection parameters
DB_URI = "postgresql://postgres:Nlider11@localhost:5432/mrms"

# Realistic Medical Scenarios
medical_scenarios = [
    {"condition": "Essential Hypertension", "prescription": "Lisinopril 10mg daily. Monitor blood pressure."},
    {"condition": "Type 2 Diabetes Mellitus", "prescription": "Metformin 500mg twice daily with meals."},
    {"condition": "Acute Bronchitis", "prescription": "Azithromycin 250mg for 5 days. Rest and hydration."},
    {"condition": "Migraine without aura", "prescription": "Sumatriptan 50mg as needed for onset."},
    {"condition": "Asthma", "prescription": "Albuterol HFA 2 puffs every 4-6 hours as needed."},
    {"condition": "Gastroesophageal Reflux Disease (GERD)", "prescription": "Omeprazole 20mg daily before breakfast."},
    {"condition": "Hyperlipidemia", "prescription": "Atorvastatin 20mg daily at bedtime."},
    {"condition": "Anxiety Disorder", "prescription": "Escitalopram 10mg daily. Cognitive behavioral therapy recommended."}
]

severities = ['Mild', 'Moderate', 'Critical']

def random_date(start, end):
    """Generate a random datetime between `start` and `end`"""
    return start + timedelta(
        seconds=random.randint(0, int((end - start).total_seconds())),
    )

def seed_diagnoses():
    conn = None
    cursor = None
    try:
        # Connect to the PostgreSQL database
        conn = psycopg2.connect(DB_URI)
        cursor = conn.cursor()
        
        print("Connected to the database. Fetching Patients and Doctors...")

        # 1. Fetch all Patient IDs
        cursor.execute('SELECT id FROM "Patients"')
        patients = [row[0] for row in cursor.fetchall()]
        
        if not patients:
            print("No patients found in the database. Exiting.")
            return

        # 2. Fetch all Doctor IDs
        cursor.execute('SELECT id FROM "Doctors"')
        doctors = [row[0] for row in cursor.fetchall()]

        if not doctors:
            print("No doctors found in the database. Exiting.")
            return

        print(f"Found {len(patients)} patients and {len(doctors)} doctors. Seeding Diagnoses...")

        now = datetime.now()
        thirty_days_ago = now - timedelta(days=30)
        
        inserted_count = 0

        # 3. Loop through EVERY patient
        for patient_id in patients:
            scenario = random.choice(medical_scenarios)
            severity = random.choice(severities)
            doctor_id = random.choice(doctors)
            date = random_date(thirty_days_ago, now)
            
            diagnosis_id = str(uuid.uuid4())

            # Execute INSERT statement
            insert_query = """
                INSERT INTO "Diagnoses" (id, "patientId", "doctorId", condition, severity, prescription, date, "createdAt", "updatedAt")
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """
            cursor.execute(insert_query, (
                diagnosis_id,
                patient_id,
                doctor_id,
                scenario["condition"],
                severity,
                scenario["prescription"],
                date.date(),
                now,
                now
            ))
            
            inserted_count += 1

        # Commit all transactions
        conn.commit()
        print(f"Seeding complete! Successfully generated {inserted_count} diagnoses.")

    except (Exception, psycopg2.Error) as error:
        print("Error while connecting to PostgreSQL or inserting data:", error)
        if conn:
            conn.rollback()

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()
            print("PostgreSQL connection is closed.")

if __name__ == "__main__":
    seed_diagnoses()
