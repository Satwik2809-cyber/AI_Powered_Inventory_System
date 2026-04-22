
from sqlalchemy import text
from database import engine

def migrate():
    with engine.connect() as conn:
        print("Adding total_quantity to sales table...")
        try:
            conn.execute(text("ALTER TABLE sales ADD COLUMN total_quantity INTEGER DEFAULT 0"))
            conn.commit()
            print("Successfully added total_quantity column.")
        except Exception as e:
            print(f"Error or column already exists: {e}")

if __name__ == "__main__":
    migrate()
