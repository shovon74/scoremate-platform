from functools import wraps
from flask import abort
from flask_login import current_user

def role_required(*roles):
    """
    Decorator to restrict access to routes based on user roles.
    Example: @role_required('admin', 'teacher')
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if not current_user.is_authenticated:
                # Flask-Login's @login_required handles redirection to login_view,
                # but we add this as a safety check if used standalone.
                return abort(401)
            
            if current_user.role not in roles:
                # User is logged in but doesn't have the required role
                return abort(403)
                
            return f(*args, **kwargs)
        return decorated_function
    return decorator
