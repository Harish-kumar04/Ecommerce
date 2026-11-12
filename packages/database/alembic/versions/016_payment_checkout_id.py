"""Add checkout_id to payments for Razorpay/webhook reconciliation.

Adds ``payments.checkout_id`` (nullable FK -> checkouts.id, indexed) so
payment webhooks (e.g. Razorpay plink_* -> pay_* / order.paid) reconcile
reliably by notes.checkout_id.

Revision ID: 016_payment_checkout_id
Revises: 015_clerk_user_id
Create Date: 2026-11-12
"""

from alembic import op

revision = "016_payment_checkout_id"
down_revision = "015_clerk_user_id"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE payments ADD COLUMN IF NOT EXISTS checkout_id UUID REFERENCES checkouts(id)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_payments_checkout_id ON payments (checkout_id)"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_payments_checkout_id")
    op.execute("ALTER TABLE payments DROP COLUMN IF EXISTS checkout_id")
