import sqlite3

def migrate():
    try:
        conn = sqlite3.connect('database.db')
        cursor = conn.cursor()
        cursor.execute("ALTER TABLE eventstock ADD COLUMN is_gift BOOLEAN DEFAULT 0;")
        conn.commit()
        print("Migration successful: Added is_gift to eventstock.")
    except Exception as e:
        print(f"Migration error or already applied: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
