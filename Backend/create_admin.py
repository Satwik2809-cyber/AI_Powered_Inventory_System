from sqlmodel import Session, select
from database import engine
from models import User
from auth import hash_password

ADMIN_USERNAME = "Sanjana"
ADMIN_PASSWORD = "123"

with Session(engine) as session:
    existing = session.exec(
        select(User).where(User.username == ADMIN_USERNAME)
    ).first()

    if existing:
        print("Admin already exists")
    else:
        admin = User(
            username=ADMIN_USERNAME,
            password_hash=hash_password(ADMIN_PASSWORD),
            role="user",
            is_active=True
        )
        session.add(admin)
        session.commit()
        print("Admin user created successfully")
