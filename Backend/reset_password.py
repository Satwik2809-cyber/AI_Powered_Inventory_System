import os
from sqlmodel import Session, select
from database import engine
from models import User
from auth import hash_password

def reset_satwik():
    with Session(engine) as session:
        user = session.exec(select(User).where(User.username == "Satwik")).first()
        if user:
            print(f"Found user: {user.username}, role: {user.role}")
            user.password_hash = hash_password("password")
            session.commit()
            print("Password reset to 'password'")
        else:
            print("User Satwik not found. Creating user Satwik.")
            new_user = User(
                username="Satwik",
                name="Satwik",
                password_hash=hash_password("password"),
                role="admin",
                is_active=True
            )
            session.add(new_user)
            session.commit()
            print("User Satwik created with password 'password'")

if __name__ == "__main__":
    reset_satwik()
