"""phase2_auth_foundation

Revision ID: 20261114_0001
Revises:
Create Date: 2026-11-14 18:15:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '20261114_0001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = inspector.get_table_names()

    # 1. Base tables (created if fresh database)
    if 'patients' not in existing_tables:
        op.create_table(
            'patients',
            sa.Column('id', sa.String(length=32), nullable=False),
            sa.Column('full_name', sa.String(length=128), nullable=False),
            sa.Column('age', sa.Integer(), nullable=False),
            sa.Column('sex', sa.String(length=16), nullable=True),
            sa.Column('original_severity', sa.Integer(), nullable=False),
            sa.Column('effective_severity', sa.Integer(), nullable=False),
            sa.Column('chief_complaint', sa.Text(), nullable=False),
            sa.Column('arrival_time', sa.DateTime(), nullable=False),
            sa.Column('assigned_nurse', sa.String(length=64), nullable=True),
            sa.Column('status', sa.String(length=32), nullable=False),
            sa.Column('arrival_order', sa.Integer(), nullable=False),
            sa.Column('waiting_minutes', sa.Float(), nullable=True),
            sa.Column('treatment_start_time', sa.DateTime(), nullable=True),
            sa.Column('treatment_end_time', sa.DateTime(), nullable=True),
            sa.Column('current_room_id', sa.String(length=32), nullable=True),
            sa.Column('is_simulated', sa.Boolean(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.Column('updated_at', sa.DateTime(), nullable=True),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index('ix_patients_id', 'patients', ['id'], unique=False)
        op.create_index('ix_patients_full_name', 'patients', ['full_name'], unique=False)
        op.create_index('ix_patients_status', 'patients', ['status'], unique=False)
        op.create_index('ix_patients_arrival_order', 'patients', ['arrival_order'], unique=False)

    if 'treatment_rooms' not in existing_tables:
        op.create_table(
            'treatment_rooms',
            sa.Column('id', sa.String(length=32), nullable=False),
            sa.Column('name', sa.String(length=64), nullable=False),
            sa.Column('room_type', sa.String(length=32), nullable=True),
            sa.Column('is_occupied', sa.Boolean(), nullable=False),
            sa.Column('current_patient_id', sa.String(length=32), nullable=True),
            sa.Column('occupied_at', sa.DateTime(), nullable=True),
            sa.Column('assigned_doctor', sa.String(length=64), nullable=True),
            sa.PrimaryKeyConstraint('id')
        )

    if 'treatment_records' not in existing_tables:
        op.create_table(
            'treatment_records',
            sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
            sa.Column('patient_id', sa.String(length=32), nullable=False),
            sa.Column('room_id', sa.String(length=32), nullable=False),
            sa.Column('room_name', sa.String(length=64), nullable=False),
            sa.Column('admitted_at', sa.DateTime(), nullable=False),
            sa.Column('discharged_at', sa.DateTime(), nullable=True),
            sa.Column('notes', sa.Text(), nullable=True),
            sa.Column('outcome', sa.String(length=64), nullable=True),
            sa.ForeignKeyConstraint(['patient_id'], ['patients.id'], ),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index('ix_treatment_records_patient_id', 'treatment_records', ['patient_id'], unique=False)

    if 'system_settings' not in existing_tables:
        op.create_table(
            'system_settings',
            sa.Column('key', sa.String(length=64), nullable=False),
            sa.Column('value', sa.String(length=255), nullable=False),
            sa.Column('description', sa.String(length=255), nullable=True),
            sa.PrimaryKeyConstraint('key')
        )

    if 'activity_logs' not in existing_tables:
        op.create_table(
            'activity_logs',
            sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
            sa.Column('timestamp', sa.DateTime(), nullable=False),
            sa.Column('event_type', sa.String(length=64), nullable=False),
            sa.Column('description', sa.String(length=255), nullable=False),
            sa.Column('patient_id', sa.String(length=32), nullable=True),
            sa.Column('details', sa.Text(), nullable=True),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index('ix_activity_logs_event_type', 'activity_logs', ['event_type'], unique=False)
        op.create_index('ix_activity_logs_patient_id', 'activity_logs', ['patient_id'], unique=False)

    # 2. Phase 2 Auth Tables: users
    if 'users' not in existing_tables:
        op.create_table(
            'users',
            sa.Column('id', sa.String(length=32), nullable=False),
            sa.Column('username', sa.String(length=64), nullable=False),
            sa.Column('email', sa.String(length=128), nullable=False),
            sa.Column('hashed_password', sa.String(length=255), nullable=False),
            sa.Column('full_name', sa.String(length=128), nullable=False),
            sa.Column('role', sa.String(length=32), server_default='UNASSIGNED', nullable=False),
            sa.Column('status', sa.String(length=32), server_default='PENDING', nullable=False),
            sa.Column('department', sa.String(length=64), server_default='Emergency Department', nullable=False),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.Column('approved_at', sa.DateTime(), nullable=True),
            sa.Column('approved_by_id', sa.String(length=32), nullable=True),
            sa.ForeignKeyConstraint(['approved_by_id'], ['users.id'], ondelete='SET NULL'),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index('ix_users_id', 'users', ['id'], unique=False)
        op.create_index('ix_users_username', 'users', ['username'], unique=True)
        op.create_index('ix_users_email', 'users', ['email'], unique=True)
        op.create_index('ix_users_status', 'users', ['status'], unique=False)

    # 3. Phase 2 Auth Tables: user_sessions (stores SHA-256 session_token_hash)
    if 'user_sessions' not in existing_tables:
        op.create_table(
            'user_sessions',
            sa.Column('id', sa.String(length=36), nullable=False),
            sa.Column('session_token_hash', sa.String(length=64), nullable=False),
            sa.Column('csrf_token', sa.String(length=64), nullable=False),
            sa.Column('user_id', sa.String(length=32), nullable=False),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.Column('expires_at', sa.DateTime(), nullable=False),
            sa.Column('last_activity_at', sa.DateTime(), nullable=False),
            sa.Column('is_revoked', sa.Boolean(), server_default='0', nullable=False),
            sa.Column('ip_address', sa.String(length=45), nullable=True),
            sa.Column('user_agent', sa.String(length=255), nullable=True),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index('ix_user_sessions_session_token_hash', 'user_sessions', ['session_token_hash'], unique=True)
        op.create_index('ix_user_sessions_user_id', 'user_sessions', ['user_id'], unique=False)
        op.create_index('ix_user_sessions_expires_at', 'user_sessions', ['expires_at'], unique=False)
        op.create_index('ix_user_sessions_is_revoked', 'user_sessions', ['is_revoked'], unique=False)

    # 4. Alter activity_logs to add user tracking if not already present
    activity_cols = [c['name'] for c in inspector.get_columns('activity_logs')]
    with op.batch_alter_table('activity_logs', schema=None) as batch_op:
        if 'user_id' not in activity_cols:
            batch_op.add_column(sa.Column('user_id', sa.String(length=32), nullable=True))
            batch_op.create_foreign_key('fk_activity_logs_user_id', 'users', ['user_id'], ['id'], ondelete='SET NULL')
            batch_op.create_index('ix_activity_logs_user_id', ['user_id'], unique=False)
        if 'user_name' not in activity_cols:
            batch_op.add_column(sa.Column('user_name', sa.String(length=128), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table('activity_logs', schema=None) as batch_op:
        batch_op.drop_column('user_name')
        batch_op.drop_column('user_id')

    op.drop_table('user_sessions')
    op.drop_table('users')
