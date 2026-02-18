"""
Add missing candidate status columns if they don't exist
Run this once to ensure database is up to date
"""
import os
from app.core.database import engine
from sqlalchemy import text

def add_missing_columns():
    """Add missing columns to candidates table if they don't exist"""
    with engine.connect() as conn:
        # Check if columns exist and add if not
        try:
            # Test if column exists by trying to query it
            result = conn.execute(text(
                "SELECT column_name FROM information_schema.columns "
                "WHERE table_name='candidates' AND column_name='is_active'"
            )).fetchone()
            
            if not result:
                print("Adding is_active column...")
                conn.execute(text(
                    "ALTER TABLE candidates ADD COLUMN is_active BOOLEAN DEFAULT true NOT NULL"
                ))
                print("✅ Added is_active column")
        except Exception as e:
            print(f"⚠️  Error checking is_active column: {e}")
        
        try:
            result = conn.execute(text(
                "SELECT column_name FROM information_schema.columns "
                "WHERE table_name='candidates' AND column_name='contratado'"
            )).fetchone()
            
            if not result:
                print("Adding contratado column...")
                conn.execute(text(
                    "ALTER TABLE candidates ADD COLUMN contratado BOOLEAN DEFAULT false NOT NULL"
                ))
                print("✅ Added contratado column")
        except Exception as e:
            print(f"⚠️  Error checking contratado column: {e}")
        
        try:
            result = conn.execute(text(
                "SELECT column_name FROM information_schema.columns "
                "WHERE table_name='candidates' AND column_name='data_contratacao'"
            )).fetchone()
            
            if not result:
                print("Adding data_contratacao column...")
                conn.execute(text(
                    "ALTER TABLE candidates ADD COLUMN data_contratacao TIMESTAMP WITH TIME ZONE"
                ))
                print("✅ Added data_contratacao column")
        except Exception as e:
            print(f"⚠️  Error checking data_contratacao column: {e}")
        
        conn.commit()
        print("✅ Database schema updated!")

if __name__ == "__main__":
    add_missing_columns()
