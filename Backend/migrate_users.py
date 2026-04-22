import os
from database import engine
from sqlalchemy import text

def add_name_column():
    print("Starting migration...")
    with engine.connect() as conn:
        try:
            # Check if column exists first
            check_sql = "SELECT column_name FROM information_schema.columns WHERE table_name='users' AND column_name='name';"
            result = conn.execute(text(check_sql)).fetchone()
            
            if not result:
                print("Adding 'name' column to 'users' table...")
                conn.execute(text("ALTER TABLE users ADD COLUMN name VARCHAR DEFAULT ''"))
                conn.commit()
                print("Migration successful.")
            else:
                print("'name' column already exists.")
        except Exception as e:
            print(f"Migration failed: {e}")
            conn.rollback()

if __name__ == "__main__":
    add_name_column()
