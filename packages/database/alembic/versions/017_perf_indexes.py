"""Add composite performance indexes for products, orders, and categories.

Revision ID: 017_perf_indexes
Revises: 016_payment_checkout_id
Create Date: 2026-11-13
"""

from alembic import op

revision = "017_perf_indexes"
down_revision = "016_payment_checkout_id"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_products_tenant_status ON products (tenant_id, status)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_products_tenant_slug ON products (tenant_id, slug)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_products_tenant_category ON products (tenant_id, category_id)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_orders_tenant_customer_created ON orders (tenant_id, customer_id, created_at)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_orders_tenant_created ON orders (tenant_id, created_at)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_categories_tenant_slug ON categories (tenant_id, slug)"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_categories_tenant_slug")
    op.execute("DROP INDEX IF EXISTS ix_orders_tenant_created")
    op.execute("DROP INDEX IF EXISTS ix_orders_tenant_customer_created")
    op.execute("DROP INDEX IF EXISTS ix_products_tenant_category")
    op.execute("DROP INDEX IF EXISTS ix_products_tenant_slug")
    op.execute("DROP INDEX IF EXISTS ix_products_tenant_status")
