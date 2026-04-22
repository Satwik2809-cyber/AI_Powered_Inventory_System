from sqlalchemy import text
from database import engine

def apply_migration():
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE events ADD COLUMN days INTEGER DEFAULT 1;"))
            conn.commit()
            print("Successfully added 'days' column to 'events' table.")
        except Exception as e:
            print(f"Migration error or already applied: {e}")

if __name__ == "__main__":
    apply_migration()
