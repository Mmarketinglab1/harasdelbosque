from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()

DB_USER = os.getenv("DB_USER")
DB_PASS = os.getenv("DB_PASS")
DB_HOST = os.getenv("DB_HOST")
DB_NAME = os.getenv("DB_NAME")
DB_PORT = os.getenv("DB_PORT")

DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

def test_connection():
    print(f"Connecting to {DB_HOST}...")
    try:
        engine = create_engine(DATABASE_URL)
        with engine.connect() as conn:
            result = conn.execute(text("SELECT current_database();"))
            print(f"Connected successfully to: {result.fetchone()[0]}")
            
            # Check tables
            result = conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';"))
            tables = [row[0] for row in result]
            print(f"Tables found: {', '.join(tables)}")
            
            # Check for specific tables
            required_tables = ["users", "operators", "messages"]
            for table in required_tables:
                if table in tables:
                    print(f"Table '{table}' exists.")
                else:
                    print(f"Table '{table}' MISSING.")
                    
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_connection()
