"""Product management services."""

from __future__ import annotations

from uuid import UUID, uuid4

from fastapi import HTTPException
from sqlalchemy import select, update, delete
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from infalette_database.models.product import Product, ProductStatus, ProductVariant
from infalette_validation.schemas import ProductCreate


import re as _re


def normalize_series_title(name: str) -> str:
    """Standardize English series volume labels to 'Vol. N' (e.g. 'Part 2' / 'Vol 2' -> 'Vol. 2')."""
    if not name:
        return name
    normalized = _re.sub(r"\b(?:Part|Volume|Vol\.?)\s*(\d+)\b", r"Vol. \1", name, flags=_re.IGNORECASE)
    return normalized


def _merge_cover_and_gallery(cover: str | None, gallery: list[str] | None) -> tuple[str | None, list[str]]:
    """Ensure cover (`image_url`) is always first in `images`, followed by unique gallery URLs."""
    clean_cover = (cover or "").strip() or None
    images: list[str] = []
    seen: set[str] = set()
    if clean_cover:
        images.append(clean_cover)
        seen.add(clean_cover)
    for item in gallery or []:
        if isinstance(item, str):
            u = item.strip()
            if u and u not in seen:
                images.append(u)
                seen.add(u)
    effective_cover = clean_cover or (images[0] if images else None)
    return effective_cover, images


def serialize_product(product: Product) -> dict:
    """Map an ORM Product onto the ProductRead shape.

    ``image_url`` (the book cover) is ALWAYS the first item in ``images``,
    followed by any extra gallery images without duplicates.
    """
    status = getattr(product.status, "value", product.status)
    raw_gallery = list(getattr(product, "images_json", None) or []) or list(
        getattr(product, "gallery_urls", None) or []
    )
    cover, images = _merge_cover_and_gallery(getattr(product, "image_url", None), raw_gallery)
    inventory = getattr(product, "inventory_quantity", None)
    if inventory is None:
        inventory = getattr(product, "inventory", 0)
    visibility = getattr(product, "visibility", "published") or "published"
    tags = list(getattr(product, "tags", None) or [])
    dimensions_json = getattr(product, "dimensions_json", None) or {}
    return {
        "id": str(product.id),
        "tenant_id": str(product.tenant_id),
        "category_id": str(product.category_id) if getattr(product, "category_id", None) else None,
        "name": product.name,
        "slug": product.slug,
        "sku": product.sku,
        "price_cents": product.price_cents,
        "sale_price_cents": product.sale_price_cents,
        "inventory": int(inventory or 0),
        "images": images,
        "status": status,
        "visibility": visibility,
        "tags": tags,
        "dimensions_json": dimensions_json,
        "description": getattr(product, "description", None),
        "tax_class": getattr(product, "tax_class", "zero"),
        "ingredients": getattr(product, "ingredients", None),
        "safety_info": getattr(product, "safety_info", None),
        "age_suitability": getattr(
            getattr(product, "age_suitability", None), "value", None
        ),
        "pregnancy_stage": getattr(
            getattr(product, "pregnancy_stage", None), "value", None
        ),
        "meta_title": getattr(product, "meta_title", None),
        "meta_description": getattr(product, "meta_description", None),
        "image_url": cover,
        "created_at": getattr(product, "created_at", None),
        "updated_at": getattr(product, "updated_at", None),
    }


def _csv_int(value) -> int | None:
    """Parse an int-ish CSV cell (handles '1,299.00' and empty)."""
    if value is None:
        return None
    raw = str(value).strip().replace(",", "")
    if not raw:
        return None
    try:
        return int(float(raw))
    except ValueError:
        return None


def _csv_price_cents(row: dict, cents_key: str, rupees_key: str) -> int | None:
    """Price cell in cents, or rupees converted to cents."""
    cents = _csv_int(row.get(cents_key))
    if cents is not None:
        return cents
    rupees = _csv_int(row.get(rupees_key))
    if rupees is not None:
        return rupees * 100
    return None


async def import_products_csv(tenant_id: UUID, content: str | bytes, session: AsyncSession) -> dict:
    """Bulk import / update products from CSV (onboarding "imports products").

    CSV columns (header row required):
      name, sku, price (rupees) or price_cents, sale_price (rupees) or
      sale_price_cents, inventory, description, tax_class, ingredients,
      safety_info, age_suitability, pregnancy_stage, image_url

    Rows are upserted by SKU within the tenant: existing SKUs are updated,
    new SKUs are created. Honours the tenant's plan product quota.

    Returns {"created": n, "updated": n, "skipped": n, "errors": [...]}.
    """
    import csv
    import io

    from apps.api.core.feature_flags import get_tenant_plan, get_plan_quota

    if isinstance(content, bytes):
        content = content.decode("utf-8-sig", "replace")

    reader = csv.DictReader(io.StringIO(content))
    if reader.fieldnames is None:
        raise ValueError("CSV file has no header row")

    # Plan quota on total products (None = unlimited)
    plan = await get_tenant_plan(tenant_id, session)
    quota = get_plan_quota(plan, "products")

    stats = {"created": 0, "updated": 0, "skipped": 0, "errors": []}
    seen_skus: set[str] = set()

    for line_no, row in enumerate(reader, start=2):
        name = (row.get("name") or "").strip()
        sku = (row.get("sku") or "").strip()
        if not any((v or "").strip() for v in row.values()):
            continue  # truly blank line
        if not name or not sku:
            stats["skipped"] += 1
            stats["errors"].append(f"line {line_no}: name and sku are required")
            continue
        if sku in seen_skus:
            stats["skipped"] += 1
            stats["errors"].append(f"line {line_no}: duplicate sku {sku} in file")
            continue
        seen_skus.add(sku)

        price_cents = _csv_price_cents(row, "price_cents", "price")
        if price_cents is None:
            stats["skipped"] += 1
            stats["errors"].append(f"line {line_no}: price or price_cents required")
            continue
        sale_price_cents = _csv_price_cents(row, "sale_price_cents", "sale_price")

        if quota is not None:
            current_total = stats["created"] + stats["updated"] + len(
                (
                    await session.execute(
                        select(Product).where(Product.tenant_id == tenant_id)
                    )
                ).scalars().all()
            )
            if current_total >= quota:
                stats["errors"].append(
                    f"line {line_no}: plan product quota reached ({quota}); row skipped"
                )
                stats["skipped"] += 1
                continue

        existing = (
            await session.execute(
                select(Product).where(
                    Product.tenant_id == tenant_id, Product.sku == sku
                )
            )
        ).scalar_one_or_none()

        fields = dict(
            name=name,
            price_cents=price_cents,
            sale_price_cents=sale_price_cents,
            inventory=_csv_int(row.get("inventory")) or 0,
            description=(row.get("description") or "").strip() or None,
            tax_class=(row.get("tax_class") or "").strip() or "standard",
            ingredients=(row.get("ingredients") or "").strip() or None,
            safety_info=(row.get("safety_info") or "").strip() or None,
        )
        # Enum fields: keep only if valid (products remain spec-compliant)
        for field, allowed in (
            ("age_suitability", {"newborn", "infant", "toddler", "child", "all"}),
            (
                "pregnancy_stage",
                {
                    "preconception",
                    "pregnancy_first_trimester",
                    "pregnancy_second_trimester",
                    "pregnancy_third_trimester",
                    "postpartum",
                    "newborn",
                    "infant",
                    "toddler",
                },
            ),
        ):
            raw = (row.get(field) or "").strip().lower()
            if raw and raw in allowed:
                fields[field] = raw

        if existing is not None:
            for key, value in fields.items():
                setattr(existing, key, value)
            stats["updated"] += 1
        else:
            product = Product(
                tenant_id=tenant_id,
                sku=sku,
                slug=name.lower().replace(" ", "-").replace("_", "-") + f"-{uuid4().hex[:4]}",
                images_json=[u] if (u := (row.get("image_url") or "").strip()) else [],
                status=ProductStatus.ACTIVE,
                **fields,
            )
            session.add(product)
            stats["created"] += 1

    await session.commit()
    return stats


async def create_product(tenant_id: UUID, data: ProductCreate, session: AsyncSession) -> dict:
    """Create a new product."""
    if data.price_cents < 0:
        raise HTTPException(status_code=422, detail="Price must be non-negative")
    if data.sale_price_cents is not None and data.sale_price_cents > data.price_cents:
        raise HTTPException(status_code=422, detail="Sale price cannot be greater than regular price")

    slug = (data.slug or data.name.lower().replace(" ", "-").replace("_", "-")).strip()

    # Check duplicate slug in same store
    existing_slug = await session.execute(
        select(Product.id).where(Product.tenant_id == tenant_id, Product.slug == slug)
    )
    if existing_slug.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="A book with this slug already exists")

    # Check duplicate SKU in same store
    clean_sku = data.sku.strip()
    existing_sku = await session.execute(
        select(Product.id).where(Product.tenant_id == tenant_id, Product.sku == clean_sku)
    )
    if existing_sku.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="A book with this SKU already exists")

    cat_id = getattr(data, "category_id", None) or (data.category_ids[0] if getattr(data, "category_ids", None) else None)
    visibility = getattr(data, "visibility", "published") or "published"
    tags = list(getattr(data, "tags", None) or [])
    dimensions_json = getattr(data, "dimensions_json", None) or {}
    cover_url, merged_images = _merge_cover_and_gallery(
        getattr(data, "image_url", None), getattr(data, "images", None)
    )

    product = Product(
        tenant_id=tenant_id,
        name=normalize_series_title(data.name),
        slug=slug,
        description=data.description,
        category_id=cat_id,
        sku=clean_sku,
        price_cents=data.price_cents,
        sale_price_cents=data.sale_price_cents,
        tax_class=data.tax_class or "zero",
        inventory_quantity=data.inventory,
        inventory=data.inventory,
        inventory_policy="deny",
        visibility=visibility,
        tags=tags,
        dimensions_json=dimensions_json,
        image_url=cover_url,
        images_json=merged_images,
        ingredients=data.ingredients,
        safety_info=data.safety_info,
        age_suitability=data.age_suitability,
        pregnancy_stage=data.pregnancy_stage,
        status=ProductStatus.ACTIVE,
    )
    try:
        session.add(product)
        await session.commit()
    except IntegrityError as err:
        await session.rollback()
        err_msg = str(err).lower()
        if "sku" in err_msg:
            raise HTTPException(status_code=409, detail="A book with this SKU already exists")
        if "slug" in err_msg:
            raise HTTPException(status_code=409, detail="A book with this slug already exists")
        raise HTTPException(status_code=409, detail="A book with this identifier already exists")
    await session.refresh(product)
    return serialize_product(product)


async def get_product(tenant_id: UUID, product_id: UUID, session: AsyncSession):
    """Get a product by ID (serialized)."""
    result = await session.execute(
        select(Product).where(Product.id == product_id, Product.tenant_id == tenant_id)
    )
    row = result.scalar_one_or_none()
    return serialize_product(row) if row else None


async def list_products(
    tenant_id: UUID,
    session: AsyncSession,
    page: int = 1,
    per_page: int = 50,
    search: str | None = None,
    category_id: UUID | None = None,
) -> dict:
    """List products for a tenant with pagination + search (name/SKU).

    Returns ``{"data": [...], "total": n, "page": p, "per_page": pp}``.
    """
    from sqlalchemy import func as _func, or_ as _or

    query = select(Product).where(Product.tenant_id == tenant_id)
    count_query = select(_func.count(Product.id)).where(Product.tenant_id == tenant_id)
    if search:
        like = f"%{search}%"
        flt = _or(Product.name.ilike(like), Product.sku.ilike(like))
        query = query.where(flt)
        count_query = count_query.where(flt)
    if category_id is not None and hasattr(Product, "category_id"):
        query = query.where(Product.category_id == category_id)
        count_query = count_query.where(Product.category_id == category_id)

    total = (await session.execute(count_query)).scalar() or 0
    per_page = max(1, min(per_page, 200))
    page = max(1, page)
    query = (
        query.order_by(Product.created_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
    )
    rows = (await session.execute(query)).scalars().all()
    return {
        "data": [serialize_product(p) for p in rows],
        "total": int(total),
        "page": page,
        "per_page": per_page,
    }


async def update_product(tenant_id: UUID, product_id: UUID, data: Any, session: AsyncSession) -> dict | None:
    """Update a product (full or partial)."""
    existing_row = (
        await session.execute(
            select(Product).where(Product.id == product_id, Product.tenant_id == tenant_id)
        )
    ).scalar_one_or_none()
    if existing_row is None:
        return None

    data_dict = data.model_dump(exclude_unset=True) if hasattr(data, "model_dump") else (data if isinstance(data, dict) else vars(data))

    eff_price = data_dict.get("price_cents", existing_row.price_cents)
    eff_sale = data_dict.get("sale_price_cents", existing_row.sale_price_cents)
    if eff_price is not None and eff_price < 0:
        raise HTTPException(status_code=422, detail="Price must be non-negative")
    if eff_sale is not None and eff_price is not None and eff_sale > eff_price:
        raise HTTPException(status_code=422, detail="Sale price cannot be greater than regular price")

    # Check duplicate slug in same store (excluding this product)
    clean_slug = data_dict.get("slug")
    if clean_slug:
        clean_slug = str(clean_slug).strip()
        existing_slug = await session.execute(
            select(Product.id).where(
                Product.tenant_id == tenant_id,
                Product.slug == clean_slug,
                Product.id != product_id
            )
        )
        if existing_slug.scalar_one_or_none():
            raise HTTPException(status_code=409, detail="A book with this slug already exists")
    else:
        clean_slug = None

    # Check duplicate SKU in same store (excluding this product)
    clean_sku = data_dict.get("sku")
    if clean_sku:
        clean_sku = str(clean_sku).strip()
        existing_sku = await session.execute(
            select(Product.id).where(
                Product.tenant_id == tenant_id,
                Product.sku == clean_sku,
                Product.id != product_id
            )
        )
        if existing_sku.scalar_one_or_none():
            raise HTTPException(status_code=409, detail="A book with this SKU already exists")
    else:
        clean_sku = None

    cat_id = data_dict.get("category_id")
    if cat_id is None and "category_ids" in data_dict and data_dict["category_ids"]:
        cat_id = data_dict["category_ids"][0]

    vals: dict[str, Any] = {}
    if "name" in data_dict and data_dict["name"] is not None:
        vals["name"] = normalize_series_title(data_dict["name"])
    if clean_slug is not None:
        vals["slug"] = clean_slug
    if "description" in data_dict:
        vals["description"] = data_dict["description"]
    if cat_id is not None:
        vals["category_id"] = cat_id
    if clean_sku is not None:
        vals["sku"] = clean_sku
    if "price_cents" in data_dict and data_dict["price_cents"] is not None:
        vals["price_cents"] = data_dict["price_cents"]
    if "sale_price_cents" in data_dict:
        vals["sale_price_cents"] = data_dict["sale_price_cents"]
    if "tax_class" in data_dict:
        vals["tax_class"] = data_dict["tax_class"] or "zero"
    if "inventory" in data_dict and data_dict["inventory"] is not None:
        vals["inventory_quantity"] = data_dict["inventory"]
        vals["inventory"] = data_dict["inventory"]
    if "visibility" in data_dict and data_dict["visibility"] is not None:
        vals["visibility"] = data_dict["visibility"]
    if "tags" in data_dict and data_dict["tags"] is not None:
        vals["tags"] = list(data_dict["tags"] or [])
    if "dimensions_json" in data_dict and data_dict["dimensions_json"] is not None:
        vals["dimensions_json"] = data_dict["dimensions_json"] or {}

    has_cover_field = "image_url" in data_dict
    has_images_field = "images" in data_dict and data_dict["images"] is not None
    if has_cover_field and has_images_field:
        cover_url, merged_images = _merge_cover_and_gallery(
            data_dict.get("image_url"), data_dict.get("images")
        )
        vals["image_url"] = cover_url
        vals["images_json"] = merged_images
    elif has_cover_field:
        new_cover = (data_dict.get("image_url") or "").strip() or None
        old_cover = (getattr(existing_row, "image_url", None) or "").strip() or None
        old_gallery = list(getattr(existing_row, "images_json", None) or [])
        # Drop the previous cover (or index 0 if it matched old cover / single cover) so stale cover never lingers
        extras = [
            u for idx, u in enumerate(old_gallery)
            if isinstance(u, str) and u.strip() and u.strip() != old_cover and not (old_cover is None and idx == 0)
        ]
        if new_cover is None:
            vals["image_url"] = extras[0] if extras else None
            vals["images_json"] = extras
        else:
            _, merged_images = _merge_cover_and_gallery(new_cover, extras)
            vals["image_url"] = new_cover
            vals["images_json"] = merged_images
    elif has_images_field:
        raw_imgs = data_dict["images"] or []
        if not raw_imgs:
            vals["image_url"] = None
            vals["images_json"] = []
        else:
            cover_url, merged_images = _merge_cover_and_gallery(raw_imgs[0], raw_imgs[1:])
            vals["image_url"] = cover_url
            vals["images_json"] = merged_images

    if "ingredients" in data_dict:
        vals["ingredients"] = data_dict["ingredients"]
    if "safety_info" in data_dict:
        vals["safety_info"] = data_dict["safety_info"]
    if "age_suitability" in data_dict:
        vals["age_suitability"] = data_dict["age_suitability"]
    if "pregnancy_stage" in data_dict:
        vals["pregnancy_stage"] = data_dict["pregnancy_stage"]

    if vals:
        try:
            await session.execute(
                update(Product)
                .where(Product.id == product_id, Product.tenant_id == tenant_id)
                .values(**vals)
                .execution_options(synchronize_session="fetch")
            )
            await session.commit()
        except IntegrityError as err:
            await session.rollback()
            err_msg = str(err).lower()
            if "sku" in err_msg:
                raise HTTPException(status_code=409, detail="A book with this SKU already exists")
            if "slug" in err_msg:
                raise HTTPException(status_code=409, detail="A book with this slug already exists")
            raise HTTPException(status_code=409, detail="A book with this identifier already exists")

    # Spec §4 event model: product.updated
    try:
        from infalette_analytics.event_bus import record_event

        await record_event(
            tenant_id=tenant_id,
            actor_id=None,
            event_type="product.updated",
            payload={
                "product_id": str(product_id),
                "name": vals.get("name", existing_row.name),
                "sku": vals.get("sku", existing_row.sku),
            },
            session=session,
        )
    except Exception:
        pass

    return await get_product(tenant_id, product_id, session)


async def delete_product(tenant_id: UUID, product_id: UUID, session: AsyncSession) -> None:
    """Delete a product."""
    await session.execute(
        delete(Product).where(Product.id == product_id, Product.tenant_id == tenant_id)
    )
    await session.commit()


async def adjust_stock(
    tenant_id: UUID, product_id: UUID, new_quantity: int, session: AsyncSession
) -> Product | None:
    """Update only the inventory columns on a product.

    Returns the updated product or ``None`` if not found. Both
    ``inventory_quantity`` (canonical) and ``inventory`` (legacy alias)
    are kept in sync so storefront + admin consumers see the same value.
    """
    new_quantity = max(0, int(new_quantity))
    result = await session.execute(
        update(Product)
        .where(Product.id == product_id, Product.tenant_id == tenant_id)
        .values(
            inventory_quantity=new_quantity,
            inventory=new_quantity,
        )
        .execution_options(synchronize_session="fetch")
    )
    if result.rowcount == 0:
        await session.rollback()
        return None
    await session.commit()
    # Read back to return the canonical row
    fetch = await session.execute(
        select(Product).where(Product.id == product_id, Product.tenant_id == tenant_id)
    )
    return fetch.scalar_one_or_none()


async def search_products(tenant_id: UUID, query: str, session: AsyncSession) -> list[Product]:
    """Search products across Tamil/English title, slug, SKU, and description."""
    from sqlalchemy import or_

    pattern = f"%{query}%"
    result = await session.execute(
        select(Product).where(
            Product.tenant_id == tenant_id,
            Product.visibility != "hidden",
            or_(
                Product.name.ilike(pattern),
                Product.slug.ilike(pattern),
                Product.sku.ilike(pattern),
                Product.description.ilike(pattern),
            ),
        )
    )
    return list(result.scalars().all())


def serialize_variant(variant: ProductVariant) -> dict:
    """Map an ORM ProductVariant onto a plain dict for responses."""
    return {
        "id": str(variant.id),
        "tenant_id": str(variant.tenant_id),
        "product_id": str(variant.product_id),
        "sku": variant.sku,
        "price_cents": variant.price_cents,
        "sale_price_cents": variant.sale_price_cents,
        "inventory_quantity": getattr(variant, "inventory_quantity", None)
        or getattr(variant, "inventory", 0),
        "dimensions_json": getattr(variant, "dimensions_json", None),
        "created_at": getattr(variant, "created_at", None),
        "updated_at": getattr(variant, "updated_at", None),
    }


async def list_variants(tenant_id: UUID, product_id: UUID, session: AsyncSession) -> list[ProductVariant]:
    """List all variants for a product owned by the tenant."""
    result = await session.execute(
        select(ProductVariant).where(
            ProductVariant.tenant_id == tenant_id,
            ProductVariant.product_id == product_id,
        )
    )
    return [serialize_variant(v) for v in result.scalars().all()]


async def get_variant(
    tenant_id: UUID, product_id: UUID, variant_id: UUID, session: AsyncSession
) -> ProductVariant | None:
    """Get a variant by ID, scoped to the tenant and product."""
    result = await session.execute(
        select(ProductVariant).where(
            ProductVariant.id == variant_id,
            ProductVariant.product_id == product_id,
            ProductVariant.tenant_id == tenant_id,
        )
    )
    row = result.scalar_one_or_none()
    return serialize_variant(row) if row else None


async def create_variant(tenant_id: UUID, product_id: UUID, data: dict, session: AsyncSession) -> ProductVariant | None:
    """Create a new variant for a product. Returns None if the product is not found for the tenant."""
    product = await get_product(tenant_id, product_id, session)
    if not product:
        return None

    inventory = data.get("inventory_quantity", data.get("inventory", 0))
    sku = (data.get("sku") or "").strip()
    if not sku:
        n = 1
        existing = await session.execute(select(ProductVariant).where(ProductVariant.sku == f"{product['sku']}-{n}"))
        while existing.scalar_one_or_none():
            n += 1
            existing = await session.execute(select(ProductVariant).where(ProductVariant.sku == f"{product['sku']}-{n}"))
        sku = f"{product['sku']}-{n}"

    from uuid import UUID as _UUID

    variant = ProductVariant(
        tenant_id=tenant_id,
        product_id=_UUID(str(product["id"])),
        sku=sku,
        price_cents=data["price_cents"],
        sale_price_cents=data.get("sale_price_cents"),
        inventory=inventory,
        dimensions_json=data.get("dimensions_json"),
    )
    session.add(variant)
    await session.commit()
    await session.refresh(variant)
    return serialize_variant(variant)


async def update_variant(
    tenant_id: UUID, product_id: UUID, variant_id: UUID, data: dict, session: AsyncSession
) -> dict | None:
    """Update a variant with a partial dict."""
    result = await session.execute(
        select(ProductVariant).where(
            ProductVariant.id == variant_id,
            ProductVariant.product_id == product_id,
            ProductVariant.tenant_id == tenant_id,
        )
    )
    variant = result.scalar_one_or_none()
    if not variant:
        return None

    field_map = {
        "sku": "sku",
        "price_cents": "price_cents",
        "sale_price_cents": "sale_price_cents",
        "inventory_quantity": "inventory",
        "inventory": "inventory",
        "dimensions_json": "dimensions_json",
    }
    for key, column in field_map.items():
        if key in data and data[key] is not None:
            setattr(variant, column, data[key])

    await session.commit()
    await session.refresh(variant)
    return serialize_variant(variant)


async def delete_variant(tenant_id: UUID, product_id: UUID, variant_id: UUID, session: AsyncSession) -> bool:
    """Delete a variant. Returns False if it was not found."""
    result = await session.execute(
        select(ProductVariant).where(
            ProductVariant.id == variant_id,
            ProductVariant.product_id == product_id,
            ProductVariant.tenant_id == tenant_id,
        )
    )
    variant = result.scalar_one_or_none()
    if not variant:
        return False
    await session.delete(variant)
    await session.commit()
    return True
