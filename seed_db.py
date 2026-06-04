import psycopg2
import uuid
import bcrypt
from datetime import datetime

# Database connection parameters
DB_URI = "postgresql://postgres:Nlider11@localhost:5432/mrms"

# Data to inject
receptionists_data = [
    {
        "firstName": "Anna",
        "lastName": "Smith",
        "email": "anna.reception@caretracker.com",
        "password": "123456",
        "shift": "Morning",
        "phone": "+1 555-0101"
    },
    {
        "firstName": "Elena",
        "lastName": "Ivanova",
        "email": "elena.reception@caretracker.com",
        "password": "123456",
        "shift": "Evening",
        "phone": "+1 555-0102"
    },
    {
        "firstName": "Dilnoza",
        "lastName": "Aliyeva",
        "email": "dilnoza.reception@caretracker.com",
        "password": "123456",
        "shift": "Night",
        "phone": "+998 90 123 45 67"
    }
]

def seed_receptionists():
    try:
        # Connect to the PostgreSQL database
        conn = psycopg2.connect(DB_URI)
        cursor = conn.cursor()
        
        now = datetime.now()

        print("Connected to the database. Seeding receptionists...")

        for data in receptionists_data:
            user_id = str(uuid.uuid4())
            receptionist_id = str(uuid.uuid4())
            
            # Hash the password
            salt = bcrypt.gensalt()
            hashed_password = bcrypt.hashpw(data["password"].encode('utf-8'), salt).decode('utf-8')

            # 1. Insert into Users table
            insert_user_query = """
                INSERT INTO "Users" (id, "firstName", "lastName", email, password, role, "createdAt", "updatedAt")
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """
            cursor.execute(insert_user_query, (
                user_id, 
                data["firstName"], 
                data["lastName"], 
                data["email"], 
                hashed_password, 
                'Receptionist',
                now,
                now
            ))

            # 2. Insert into Receptionists table
            insert_receptionist_query = """
                INSERT INTO "Receptionists" (id, "phoneNumber", shift, status, "userId", "createdAt", "updatedAt")
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """
            cursor.execute(insert_receptionist_query, (
                receptionist_id,
                data["phone"],
                data["shift"],
                'Active',
                user_id,
                now,
                now
            ))
            
            print(f"Successfully inserted: {data['firstName']} {data['lastName']}")

        # Commit all transactions
        conn.commit()
        print("Seeding complete!")

    except (Exception, psycopg2.Error) as error:
        print("Error while connecting to PostgreSQL or inserting data:", error)
        if conn:
            conn.rollback()

    finally:
        if conn:
            cursor.close()
            conn.close()
            print("PostgreSQL connection is closed.")

if __name__ == "__main__":
    seed_receptionists()
