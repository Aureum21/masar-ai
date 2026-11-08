"""Join the applied alazar history and MASAR discovery/brief history.

No schema/data operations: each parent runs only where not already applied.
Recovered parent files are byte-for-byte copies from origin/alazar.
"""
revision='20261023_join'
down_revision=('20261023_briefs','93b1e7c4a602')
branch_labels=None
depends_on=None

def upgrade():
    pass

def downgrade():
    pass
