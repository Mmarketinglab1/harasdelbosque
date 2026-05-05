import bcrypt
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv
from models import Operator, Base

load_dotenv()

DB_USER = os.getenv("DB_USER")
DB_PASS = os.getenv("DB_PASS")
DB_HOST = os.getenv("DB_HOST")
DB_NAME = os.getenv("DB_NAME")
DB_PORT = os.getenv("DB_PORT")

DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

def get_password_hash(password):
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def create_admin(username, password, full_name):
    engine = create_engine(DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        # Check if user exists
        existing = db.query(Operator).filter(Operator.username == username).first()
        if existing:
            print(f"User {username} already exists. Updating password...")
            existing.hashed_password = get_password_hash(password)
            existing.role = "admin"
            db.commit()
            print("Password updated successfully.")
        else:
            new_admin = Operator(
                username=username,
                hashed_password=get_password_hash(password),
                full_name=full_name,
                role="admin"
            )
            db.add(new_admin)
            db.commit()
            print(f"Admin user {username} created successfully.")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    create_admin("admin_hara", "Hara2024!", "Administrador Hara")
