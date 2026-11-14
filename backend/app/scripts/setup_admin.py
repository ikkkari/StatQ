import argparse
import getpass
import os
import sys

from backend.app.database import SessionLocal
from backend.app.services.auth_service import create_user, get_user_by_username, get_user_by_email

def setup_admin():
    parser = argparse.ArgumentParser(description="StatQ 2.0 Secure Administrator Bootstrap CLI")
    parser.add_argument("--username", help="Admin username")
    parser.add_argument("--email", help="Admin email")
    parser.add_argument("--full-name", help="Admin full name")
    parser.add_argument("--password", help="Admin password (prefer prompt or env var for security)")
    args = parser.parse_args()

    db = SessionLocal()
    try:
        username = args.username or os.getenv("STATQ_ADMIN_USERNAME")
        email = args.email or os.getenv("STATQ_ADMIN_EMAIL")
        full_name = args.full_name or os.getenv("STATQ_ADMIN_FULL_NAME")
        password = args.password or os.getenv("STATQ_ADMIN_PASSWORD")

        # Interactive prompts if not supplied
        if not username:
            username = input("Enter Administrator Username: ").strip()
        if not email:
            email = input("Enter Administrator Email: ").strip()
        if not full_name:
            full_name = input("Enter Administrator Full Name (e.g. Dr. Marcus Vance): ").strip()
        if not password:
            while True:
                pwd1 = getpass.getpass("Enter Administrator Password (min 8 chars): ")
                if len(pwd1) < 8:
                    print("Error: Password must be at least 8 characters.")
                    continue
                pwd2 = getpass.getpass("Confirm Administrator Password: ")
                if pwd1 != pwd2:
                    print("Error: Passwords do not match. Please try again.")
                    continue
                password = pwd1
                break

        # Check existing
        existing = get_user_by_username(db, username)
        if existing:
            print(f"Error: User '{username}' already exists. Operation aborted.")
            sys.exit(1)

        existing_email = get_user_by_email(db, email)
        if existing_email:
            print(f"Error: Email '{email}' is already registered. Operation aborted.")
            sys.exit(1)

        admin_user = create_user(
            db=db,
            username=username,
            email=email,
            password=password,
            full_name=full_name,
            department="Administration & Clinical Oversight",
            role="ADMIN",
            status="APPROVED"
        )
        print(f"\nSUCCESS: Administrator account '{admin_user.username}' ({admin_user.id}) created and approved.")
    finally:
        db.close()

if __name__ == "__main__":
    setup_admin()
