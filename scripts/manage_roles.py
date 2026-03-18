import sys
import os

# Add the project directory to sys.path to import models
sys.path.append(os.getcwd())

from app import create_app
from models import db
from models.user import User

def promote_user(email, role):
    app = create_app()
    with app.app_context():
        user = User.query.filter_by(email=email).first()
        if not user:
            print(f"Error: User with email '{email}' not found.")
            return False
        
        valid_roles = [User.ROLE_STUDENT, User.ROLE_TEACHER, User.ROLE_SUPER_ADMIN]
        if role not in valid_roles:
            print(f"Error: Invalid role '{role}'. Valid roles are: {', '.join(valid_roles)}")
            return False
            
        user.role = role
        db.session.commit()
        print(f"Success: User '{email}' promoted to '{role}'.")
        return True

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python scripts/manage_roles.py <email> <role>")
        print("Example: python scripts/manage_roles.py admin@example.com super_admin")
        sys.exit(1)
        
    email_arg = sys.argv[1]
    role_arg = sys.argv[2]
    promote_user(email_arg, role_arg)
