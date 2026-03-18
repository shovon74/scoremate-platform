from flask import Blueprint, render_template, redirect, url_for, request, flash, abort
from flask_login import login_required, current_user
from models import db
from models.user import User
from utils.decorators import role_required

admin_bp = Blueprint('admin', __name__)

@admin_bp.route('/users')
@login_required
@role_required(User.ROLE_SUPER_ADMIN)
def user_list():
    from models.user import EvaluationResult
    from datetime import datetime, timedelta
    
    users = User.query.order_by(User.created_at.desc()).all()
    
    # Calculate stats
    total_students = User.query.filter_by(role=User.ROLE_STUDENT).count()
    
    today = datetime.utcnow().date()
    tests_today = EvaluationResult.query.filter(db.func.date(EvaluationResult.created_at) == today).count()
    
    # For now, pending tasks is 0 as we don't have a status on EvaluationResult
    pending_tasks = 0 
    
    avg_score_row = db.session.query(db.func.avg(EvaluationResult.band_score)).first()
    avg_score = round(avg_score_row[0], 1) if avg_score_row and avg_score_row[0] else 0.0
    
    stats = {
        'total_students': total_students,
        'tests_today': tests_today,
        'pending_tasks': pending_tasks,
        'avg_score': avg_score
    }
    
    return render_template('admin/users.html', users=users, stats=stats)

@admin_bp.route('/users/<int:user_id>/update-role', methods=['POST'])
@login_required
@role_required(User.ROLE_SUPER_ADMIN)
def update_role(user_id):
    user = User.query.get_or_404(user_id)
    new_role = request.form.get('role')
    
    if user.id == current_user.id:
        flash("You cannot change your own role.", "error")
        return redirect(url_for('admin.user_list'))
        
    valid_roles = [User.ROLE_STUDENT, User.ROLE_TEACHER, User.ROLE_SUPER_ADMIN]
    if new_role not in valid_roles:
        flash("Invalid role selected.", "error")
        return redirect(url_for('admin.user_list'))
        
    user.role = new_role
    db.session.commit()
    flash(f"Role for {user.email} updated to {new_role}.", "success")
    return redirect(url_for('admin.user_list'))
