import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

load_dotenv()

# Jika berjalan di cloud Vercel, arahkan SQLite ke folder /tmp yang bisa ditulis
if os.getenv("VERCEL"):
    default_db = "sqlite:////tmp/kalkulator_duit.db"
else:
    default_db = "sqlite:///./kalkulator_duit.db"

DATABASE_URL = os.getenv("DATABASE_URL", default_db)

if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False}
    )
else:
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        pool_recycle=3600
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
