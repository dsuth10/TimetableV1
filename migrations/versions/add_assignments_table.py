"""Add assignments table

Revision ID: add_assignments_table
Revises: previous_revision
Create Date: 2024-03-19 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_assignments_table'
down_revision = 'previous_revision'  # Update this to your last migration
branch_labels = None
depends_on = None

def upgrade():
    op.create_table(
        'assignments',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('task_id', sa.Integer(), nullable=False),
        sa.Column('aide_id', sa.Integer(), nullable=False),
        sa.Column('day', sa.String(10), nullable=False),
        sa.Column('start_time', sa.String(5), nullable=False),
        sa.Column('duration', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['task_id'], ['tasks.id'], ),
        sa.ForeignKeyConstraint(['aide_id'], ['teacher_aides.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

def downgrade():
    op.drop_table('assignments') 