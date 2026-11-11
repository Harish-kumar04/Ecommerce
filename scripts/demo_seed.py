"""Demo seed script — creates plans, the Muthamilarignar Pathipagam bookstore
tenant, owner user, categories, homepage blocks and all 27 Muthamilarignar
Pathipagam books from CommonFolks. Idempotent: safe to re-run.

Usage:
    python scripts/demo_seed.py                 # uses DATABASE_URL (sqlite fallback)
Env:
    DEMO_TENANT_SLUG   (default: demo-store)
    DEMO_OWNER_EMAIL   (default: owner@demo.test)
    DEMO_OWNER_PASSWORD(default: demo1234)
"""

from __future__ import annotations

import asyncio
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO))
for pkg in [
    "config",
    "validation",
    "database",
    "auth",
    "commerce",
    "automation",
    "analytics",
    "seo",
    "integrations",
]:
    sys.path.insert(0, str(REPO / "packages" / pkg / "src"))

TENANT_SLUG = os.environ.get("DEMO_TENANT_SLUG", "demo-store")
OWNER_EMAIL = os.environ.get("DEMO_OWNER_EMAIL", "owner@demo.test")
OWNER_PASSWORD = os.environ.get("DEMO_OWNER_PASSWORD", "demo1234")

PLANS = [
    {
        "name": "Store",
        "slug": "store",
        "price_cents": 99900,
        "description": "Custom storefront, catalog, checkout, orders, SEO",
    },
    {
        "name": "Store + Automation",
        "slug": "store_automation",
        "price_cents": 249900,
        "description": "Adds Instagram/WhatsApp automation, checkout links, unified inbox",
    },
    {
        "name": "Store + Automation + CRM",
        "slug": "store_automation_crm",
        "price_cents": 499900,
        "description": "Adds full CRM, funnel analytics, segments, exports",
    },
]

CATEGORIES = [
    {
        "name": "திராவிட இயக்க வரலாறு | Dravidian Movement History",
        "slug": "dravidian-history",
        "description": "Books on the history, ideology, and struggles of the Dravidian movement and DMK.",
    },
    {
        "name": "கலைஞர் படைப்புகள் | Kalaignar Works & Studies",
        "slug": "kalaignar-works",
        "description": "Biographies, letters, literary works, and political analyses of Muthamilarignar Kalaignar M. Karunanidhi.",
    },
    {
        "name": "திராவிட மாடல் & சமூகநீதி | Dravidian Model & Social Justice",
        "slug": "dravidian-model-social-justice",
        "description": "Publications on the Dravidian Model governance, reservation, state autonomy, and language rights.",
    },
    {
        "name": "திராவிட சினிமா & பண்பாடு | Dravidian Cinema & Culture",
        "slug": "dravidian-cinema-culture",
        "description": "Explorations of Dravidian cinema, art, cultural transformation, and youth movement.",
    },
]

# Complete 27-book catalog from Muthamilarignar Pathipagam (முத்தமிழறிஞர் பதிப்பகம்)
PRODUCTS = [
    dict(
        name="காலத்தின் நிறம் கருப்பு சிவப்பு | Kaalatthin Niram Karuppu Sivappu",
        slug="kaalatthin-niram-karuppu-sivappu",
        sku="MP-BOOK-001",
        category_slug="dravidian-history",
        price_cents=75000,
        tax_class="reduced",
        inventory_quantity=150,
        description=(
            "காலத்தின் நிறம் கருப்பு சிவப்பு — தி.மு.க.வின் வரலாற்றுப் பயணம், "
            "சமூகநீதிப் போராட்டங்கள் மற்றும் திராவிட இயக்கத்தின் சாதனைகளைப் பதிவு செய்யும் சிறப்புப் பதிப்பு. || "
            "Kaalatthin Niram Karuppu Sivappu (The Colour of Time is Black & Red) — A landmark commemorative volume "
            "chronicling the historic journey, social justice struggles, and transformative achievements of the DMK and the Dravidian movement."
        ),
        ingredients="முத்தமிழறிஞர் பதிப்பகம் | Muthamilarignar Pathipagam",
        safety_info="Hardcover / Collector's Edition • Tamil • Original Publisher Edition",
        image="https://s3.ap-south-1.amazonaws.com/storage.commonfolks.in/docs/products/images/kaalatthin-niram-karuppu-sivappu_FrontImage_619.jpg",
    ),
    dict(
        name="இளைய திராவிடம் எழுகிறது | Ilaya Dravidam Ezhugirathu",
        slug="ilaya-dravidam-ezhugirathu",
        sku="MP-BOOK-002",
        category_slug="dravidian-cinema-culture",
        price_cents=4000,
        tax_class="reduced",
        inventory_quantity=200,
        description=(
            "இளைய தலைமுறையினருக்குத் திராவிட இயக்கத்தின் கொள்கைகளையும் வரலாற்றையும் எளிமையாக எடுத்துரைக்கும் நூல். || "
            "Ilaya Dravidam Ezhugirathu (Young Dravidam Rises) — An inspiring handbook introducing the new generation "
            "to the foundational ideals, rationalism, and progressive vision of the Dravidian movement."
        ),
        ingredients="முத்தமிழறிஞர் பதிப்பகம் | Muthamilarignar Pathipagam",
        safety_info="Paperback • Tamil • Youth & Ideology Series",
        image="https://s3.ap-south-1.amazonaws.com/storage.commonfolks.in/docs/products/images/ilaya-dravidam-ezhugirathu_FrontImage_645.jpg",
    ),
    dict(
        name="இந்தியாவில் சமூகநீதியும் இடஒதுக்கீடும் ? | Indiavil Samuganithiyum Idaothikkidum?",
        slug="indiavil-samuganithiyum-idaothikkidum",
        sku="MP-BOOK-003",
        category_slug="dravidian-model-social-justice",
        price_cents=4000,
        tax_class="reduced",
        inventory_quantity=200,
        description=(
            "இந்தியாவில் சமூகநீதி மற்றும் இடஒதுக்கீட்டு வரலாற்றை வினா-விடை வடிவில் தெளிவாக விளக்கும் நூல். || "
            "Indiavil Samuganithiyum Idaothikkidum? (Social Justice & Reservation in India) — A clear question-and-answer "
            "guide explaining constitutional reservation, social justice milestones, and Tamil Nadu's pioneering role."
        ),
        ingredients="முத்தமிழறிஞர் பதிப்பகம் | Muthamilarignar Pathipagam",
        safety_info="Paperback • Tamil • Q&A Primer Series",
        image="https://s3.ap-south-1.amazonaws.com/storage.commonfolks.in/docs/products/images/indiavil-samuganithiyum-idaothikkidum-kelvi-bathil_FrontImage_782.jpg",
    ),
    dict(
        name="இந்தியாவுக்கு வழிகாட்டும் திராவிட மாடல் | Indiavuku Vazhikatum Dravida Maadal",
        slug="indiavuku-vazhikatum-dravida-maadal",
        sku="MP-BOOK-004",
        category_slug="dravidian-model-social-justice",
        price_cents=4000,
        tax_class="reduced",
        inventory_quantity=220,
        description=(
            "கல்வி, மருத்துவம், சமூகநலன் மற்றும் பொருளாதார வளர்ச்சியில் இந்தியாவுக்கே வழிகாட்டும் தமிழ்நாட்டின் 'திராவிட மாடல்' ஆட்சி முறை குறித்த நூல். || "
            "Indiavuku Vazhikatum Dravida Maadal (The Dravidian Model Guiding India) — An insightful overview of how Tamil Nadu's "
            "inclusive 'Dravidian Model' of governance leads India across education, healthcare, women's empowerment, and industrial growth."
        ),
        ingredients="முத்தமிழறிஞர் பதிப்பகம் | Muthamilarignar Pathipagam",
        safety_info="Paperback • Tamil • Governance & Policy Series",
        image="https://s3.ap-south-1.amazonaws.com/storage.commonfolks.in/docs/products/images/indiavuku-vazhikatum-dravida-maadal_FrontImage_189.jpg",
    ),
    dict(
        name="இந்தித் திணிப்பை எதிர்க்கிறோம்-ஏன்? | Hindhi Theenipai Ethirkirom - Yen?",
        slug="hindhi-theenipai-ethirkirom-yen",
        sku="MP-BOOK-005",
        category_slug="dravidian-model-social-justice",
        price_cents=4000,
        tax_class="reduced",
        inventory_quantity=250,
        description=(
            "மொழி உரிமைப் போராட்ட வரலாறு மற்றும் இந்தித் திணிப்பைத் தமிழ்நாடு ஏன் தொடர்ந்து எதிர்க்கிறது என்பதை ஆதாரங்களுடன் விளக்கும் நூல். || "
            "Hindhi Theenipai Ethirkirom - Yen? (Why We Oppose Hindi Imposition) — A historical and constitutional account of "
            "Tamil Nadu's anti-Hindi imposition struggles, linguistic federalism, and the defense of mother-tongue rights."
        ),
        ingredients="முத்தமிழறிஞர் பதிப்பகம் | Muthamilarignar Pathipagam",
        safety_info="Paperback • Tamil • Language Rights Series",
        image="https://s3.ap-south-1.amazonaws.com/storage.commonfolks.in/docs/products/images/hindhi-theenipai-ethirkirom-yen_FrontImage_541.jpg",
    ),
    dict(
        name="திராவிட இயக்க வரலாறு - கேள்வி-பதில் | Dravida Iyakka Varalaru - Kelvi-Bathil",
        slug="dravida-iyakka-varalaru-kelvi-bathil",
        sku="MP-BOOK-006",
        category_slug="dravidian-history",
        price_cents=4000,
        tax_class="reduced",
        inventory_quantity=250,
        description=(
            "நீதிக்கட்சி காலம் முதல் திராவிட இயக்கத்தின் வளர்ச்சி வரை அனைவரும் அறிந்துகொள்ள வேண்டிய வரலாற்றுத் தகவல்கள் கேள்வி-பதில் வடிவில். || "
            "Dravida Iyakka Varalaru - Kelvi-Bathil (History of the Dravidian Movement Q&A) — Essential history of the Dravidian movement "
            "from the Justice Party and Self-Respect Movement to modern Tamil Nadu presented in an accessible Q&A format."
        ),
        ingredients="முத்தமிழறிஞர் பதிப்பகம் | Muthamilarignar Pathipagam",
        safety_info="Paperback • Tamil • History Q&A Series",
        image="https://s3.ap-south-1.amazonaws.com/storage.commonfolks.in/docs/products/images/dravida-iyakka-varalaru-kelvi-bathil_FrontImage_517.jpg",
    ),
    dict(
        name="மாநில சுயாட்சி முழக்கம் | Maanilla Suyatchi Muzhukkam",
        slug="maanilla-suyatchi-muzhukkam",
        sku="MP-BOOK-007",
        category_slug="dravidian-model-social-justice",
        price_cents=4000,
        tax_class="reduced",
        inventory_quantity=180,
        description=(
            "மத்தியில் கூட்டாட்சி, மாநிலத்தில் சுயாட்சி என்ற முத்தமிழறிஞர் கலைஞரின் வரலாற்று முழக்கத்தையும் ராஜமன்னார் குழு அறிக்கையையும் விளக்கும் நூல். || "
            "Maanilla Suyatchi Muzhukkam (The Call for State Autonomy) — Explores the constitutional demand for true federalism, "
            "Kalaignar's historic State Autonomy resolution, and the Rajamannar Committee recommendations."
        ),
        ingredients="முத்தமிழறிஞர் பதிப்பகம் | Muthamilarignar Pathipagam",
        safety_info="Paperback • Tamil • Federalism & Policy Series",
        image="https://s3.ap-south-1.amazonaws.com/storage.commonfolks.in/docs/products/images/maanilla-suyatchi-muzhukkam_FrontImage_336.jpg",
    ),
    dict(
        name="தமிழ்நாடு போராடும் - தமிழ்நாடு வெல்லும் | Tamilnadu Poradum - Tamilnadu Vellum",
        slug="tamilnadu-poradum-tamilnadu-vellum",
        sku="MP-BOOK-008",
        category_slug="dravidian-model-social-justice",
        price_cents=4000,
        tax_class="reduced",
        inventory_quantity=200,
        description=(
            "மாநில உரிமைகள், சமூகநீதி மற்றும் கூட்டாட்சித் தத்துவத்தைக் காக்க தமிழ்நாடு முன்னெடுக்கும் உரிமைப் போராட்டங்களின் தொகுப்பு. || "
            "Tamilnadu Poradum - Tamilnadu Vellum (Tamil Nadu Will Fight, Tamil Nadu Will Win) — A powerful chronicle of Tamil Nadu's "
            "unyielding democratic battles to safeguard state rights, social justice, and constitutional federalism."
        ),
        ingredients="முத்தமிழறிஞர் பதிப்பகம் | Muthamilarignar Pathipagam",
        safety_info="Paperback • Tamil • Contemporary Politics",
        image="https://s3.ap-south-1.amazonaws.com/storage.commonfolks.in/docs/products/images/tamilnadu-poradum-tamilnadu-vellum_FrontImage_976.jpg",
    ),
    dict(
        name="திராவிட சினிமா (பாகம் - 2) | Dravida Cinema (Part 2)",
        slug="dravida-cinema-paagam-2",
        sku="MP-BOOK-009",
        category_slug="dravidian-cinema-culture",
        price_cents=15000,
        tax_class="reduced",
        inventory_quantity=120,
        description=(
            "தமிழ்த் திரையுலகில் திராவிட இயக்கப் படைப்பாளிகள் ஏற்படுத்திய சமூக மாற்றம் மற்றும் பகுத்தறிவுக் கருத்துக்களின் வரலாறு — பாகம் 2. || "
            "Dravida Cinema (Part 2) — Volume 2 examining how Dravidian movement screenwriters, lyricists, and filmmakers "
            "transformed Tamil cinema into a medium for social reform, Tamil pride, and rationalist thought."
        ),
        ingredients="முத்தமிழறிஞர் பதிப்பகம் | Muthamilarignar Pathipagam",
        safety_info="Paperback • Tamil • Cinema & Culture Vol. 2",
        image="https://s3.ap-south-1.amazonaws.com/storage.commonfolks.in/docs/products/images/dravida-cinema-paagam-2_FrontImage_476.jpg",
    ),
    dict(
        name="திராவிட மாடல் அரசு (பாகம் 2) | Dravida Model Arasu (Part 2)",
        slug="dravida-model-arasu-paagam-2",
        sku="MP-BOOK-010",
        category_slug="dravidian-model-social-justice",
        price_cents=30000,
        tax_class="reduced",
        inventory_quantity=100,
        description=(
            "முத்துவேல் கருணாநிதி ஸ்டாலின் தலைமையிலான திராவிட மாடல் அரசின் முத்திரைத் திட்டங்கள் மற்றும் சாதனைகளின் விரிவான தொகுப்பு — பாகம் 2. || "
            "Dravida Model Arasu (Part 2) — Comprehensive documentation of the flagship welfare schemes, policy innovations, "
            "and socio-economic milestones of the Dravidian Model government (Volume 2)."
        ),
        ingredients="முத்தமிழறிஞர் பதிப்பகம் | Muthamilarignar Pathipagam",
        safety_info="Paperback • Tamil • Governance & Policy Vol. 2",
        image="https://s3.ap-south-1.amazonaws.com/storage.commonfolks.in/docs/products/images/dravida-model-arasu-paagam-2_FrontImage_339.jpg",
    ),
    dict(
        name="திராவிடப் போராளிகள் (பாகம் 2) | Dravida Poraligal (Part 2)",
        slug="dravida-poraligal-paagam-2",
        sku="MP-BOOK-011",
        category_slug="dravidian-history",
        price_cents=15000,
        tax_class="reduced",
        inventory_quantity=120,
        description=(
            "திராவிட இயக்கத்திற்காகத் தம் வாழ்வை அர்ப்பணித்த களப் போராளிகள் மற்றும் முன்னோடிகளின் வாழ்க்கை வரலாறு — பாகம் 2. || "
            "Dravida Poraligal (Part 2) — Inspiring biographical portraits of the unsung warriors, leaders, and grassroots "
            "stalwarts who built and defended the Dravidian movement (Volume 2)."
        ),
        ingredients="முத்தமிழறிஞர் பதிப்பகம் | Muthamilarignar Pathipagam",
        safety_info="Paperback • Tamil • Biographies Vol. 2",
        image="https://s3.ap-south-1.amazonaws.com/storage.commonfolks.in/docs/products/images/dravida-poraligal-paagam-2_FrontImage_992.jpg",
    ),
    dict(
        name="உடன் பிறப்பே (பாகம் 2) | Udan Pireppe (Part 2)",
        slug="udan-pireppe-paagam-2",
        sku="MP-BOOK-012",
        category_slug="kalaignar-works",
        price_cents=20000,
        tax_class="reduced",
        inventory_quantity=130,
        description=(
            "முத்தமிழறிஞர் கலைஞர் அவர்கள் கழக உடன்பிறப்புகளுக்கு எழுதிய வரலாற்றுச் சிறப்புமிக்க கடிதங்களின் தேர்ந்தெடுக்கப்பட்ட தொகுப்பு — பாகம் 2. || "
            "Udan Pireppe (Part 2) — Volume 2 of Muthamilarignar Kalaignar's iconic 'Dear Brethren' epistolary essays, "
            "blending political philosophy, literature, history, and organizational guidance."
        ),
        ingredients="முத்தமிழறிஞர் பதிப்பகம் | Muthamilarignar Pathipagam",
        safety_info="Paperback • Tamil • Kalaignar Letters Vol. 2",
        image="https://s3.ap-south-1.amazonaws.com/storage.commonfolks.in/docs/products/images/udan-pireppe-paagam-2_FrontImage_577.jpg",
    ),
    dict(
        name="இடம் பொருள் கலைஞர் (பாகம் 2) | Idam Porul Kalaignar (Part 2)",
        slug="idam-porul-kalaignar-paagam-2",
        sku="MP-BOOK-013",
        category_slug="kalaignar-works",
        price_cents=15000,
        tax_class="reduced",
        inventory_quantity=140,
        description=(
            "முத்தமிழறிஞர் கலைஞரின் அரசியல், இலக்கியம் மற்றும் ஆளுமைத் திறனைப் பல்வேறு கோணங்களில் ஆராயும் கட்டுரைத் தொகுப்பு — பாகம் 2. || "
            "Idam Porul Kalaignar (Part 2) — Volume 2 capturing the wit, statesmanship, literary mastery, and historical "
            "interventions of Kalaignar M. Karunanidhi across decades of public life."
        ),
        ingredients="முத்தமிழறிஞர் பதிப்பகம் | Muthamilarignar Pathipagam",
        safety_info="Paperback • Tamil • Kalaignar Studies Vol. 2",
        image="https://s3.ap-south-1.amazonaws.com/storage.commonfolks.in/docs/products/images/idam-porul-kalaignar-paagam-2_FrontImage_282.jpg",
    ),
    dict(
        name="கலைஞர் இயக்கவியல் | Kalaignar Iyakkaviyal",
        slug="kalaignar-iyakkaviyal",
        sku="MP-BOOK-014",
        category_slug="kalaignar-works",
        price_cents=20000,
        tax_class="reduced",
        inventory_quantity=110,
        description=(
            "நவீன தமிழ்நாட்டைக் கட்டமைத்த முத்தமிழறிஞர் கலைஞரின் தத்துவார்த்த மற்றும் செயல்முறை இயக்கவியலை ஆராயும் நூல். || "
            "Kalaignar Iyakkaviyal (The Dialectics of Kalaignar) — An analytical study of Kalaignar M. Karunanidhi's political "
            "philosophy, ideological resilience, administrative statecraft, and social reform legacy."
        ),
        ingredients="முத்தமிழறிஞர் பதிப்பகம் | Muthamilarignar Pathipagam",
        safety_info="Paperback • Tamil • Political Philosophy",
        image="https://s3.ap-south-1.amazonaws.com/storage.commonfolks.in/docs/products/images/kalaignar-iyakkaviyal_FrontImage_350.jpg",
    ),
    dict(
        name="கலைஞரும் நானும் (பாகம் 2) | Kalaignarum Naanum (Part 2)",
        slug="kalaignarum-naanum-paagam-2",
        sku="MP-BOOK-015",
        category_slug="kalaignar-works",
        price_cents=15000,
        tax_class="reduced",
        inventory_quantity=125,
        description=(
            "முத்தமிழறிஞர் கலைஞருடனான மறக்க முடியாத அனுபவங்களையும் நினைவுகளையும் ஆளுமைகள் பகிர்ந்து கொள்ளும் நூல் — பாகம் 2. || "
            "Kalaignarum Naanum (Part 2) — Personal memoirs and intimate recollections by eminent leaders, writers, and "
            "contemporaries on their journey alongside Muthamilarignar Kalaignar (Volume 2)."
        ),
        ingredients="முத்தமிழறிஞர் பதிப்பகம் | Muthamilarignar Pathipagam",
        safety_info="Paperback • Tamil • Memoirs Vol. 2",
        image="https://s3.ap-south-1.amazonaws.com/storage.commonfolks.in/docs/products/images/kalaignarum-naanum-paagam-2_FrontImage_139.jpg",
    ),
    dict(
        name="திமுக இளைஞரணி அத்தியாயம் - 1 | DMK Ilaignarani Athiyayam - 1",
        slug="dmk-ilaignarani-athiyayam-1",
        sku="MP-BOOK-016",
        category_slug="dravidian-history",
        price_cents=35000,
        tax_class="reduced",
        inventory_quantity=100,
        description=(
            "ஜான்சி ராணி பூங்காவில் தொடங்கிய தி.மு.க. இளைஞரணியின் உருவாக்கம், போராட்டங்கள் மற்றும் வளர்ச்சிப் பாதையின் வரலாற்று ஆவணம் — அத்தியாயம் 1. || "
            "DMK Ilaignarani Athiyayam - 1 (DMK Youth Wing Chapter 1) — A richly illustrated historical volume documenting "
            "the founding of the DMK Youth Wing in Madurai (1980) and its evolution into a premier ideological force."
        ),
        ingredients="முத்தமிழறிஞர் பதிப்பகம் | Muthamilarignar Pathipagam",
        safety_info="Deluxe Paperback • Tamil • Youth Wing History",
        image="https://s3.ap-south-1.amazonaws.com/storage.commonfolks.in/docs/products/images/dmk-ilaignarani-athiyayam-1_FrontImage_756.jpg",
    ),
    dict(
        name="திராவிடத்தால் வாழ்கிறோம் 3 | Dravidaththaal Vaazhkirom 3",
        slug="dravidaththaal-vaazhkirom-3",
        sku="MP-BOOK-017",
        category_slug="dravidian-history",
        price_cents=25000,
        tax_class="reduced",
        inventory_quantity=115,
        description=(
            "திராவிட இயக்கம் தமிழ்ச் சமூகத்தின் கல்வி, வேலைவாய்ப்பு மற்றும் சுயமரியாதையை எவ்வாறு உயர்த்தியது என்பதை விளக்கும் கட்டுரைத் தொகுப்பு — பாகம் 3. || "
            "Dravidaththaal Vaazhkirom 3 (We Live by Dravidam Vol. 3) — Volume 3 of essays illustrating how a century of "
            "Dravidian movement policies uplifted Tamil society through education, social dignity, and equitable growth."
        ),
        ingredients="முத்தமிழறிஞர் பதிப்பகம் | Muthamilarignar Pathipagam",
        safety_info="Paperback • Tamil • Ideology Series Vol. 3",
        image="https://s3.ap-south-1.amazonaws.com/storage.commonfolks.in/docs/products/images/dravidaththaal-vaazhkirom-3_FrontImage_946.jpg",
    ),
    dict(
        name="திராவிட மாடல் அரசு | Dravida Model Arasu (Vol. 1)",
        slug="dravida-model-arasu",
        sku="MP-BOOK-018",
        category_slug="dravidian-model-social-justice",
        price_cents=30000,
        tax_class="reduced",
        inventory_quantity=110,
        description=(
            "சமூகநீதி, சமத்துவம், சுயமரியாதை மற்றும் எல்லோருக்கும் எல்லாம் என்ற திராவிட மாடல் அரசின் சாதனைத் தொகுப்பு — பாகம் 1. || "
            "Dravida Model Arasu (Vol. 1) — Volume 1 detailing the foundational principles and landmark welfare achievements "
            "of the Dravidian Model government under Chief Minister M. K. Stalin."
        ),
        ingredients="முத்தமிழறிஞர் பதிப்பகம் | Muthamilarignar Pathipagam",
        safety_info="Paperback • Tamil • Governance & Policy Vol. 1",
        image="https://s3.ap-south-1.amazonaws.com/storage.commonfolks.in/docs/products/images/dravida-model-arasu_FrontImage_297.gif",
    ),
    dict(
        name="திராவிடத்தால் வாழ்கிறோம் 2 | Dravidaththaal Vaazhkirom 2",
        slug="dravidaththaal-vaazhkirom-2",
        sku="MP-BOOK-019",
        category_slug="dravidian-history",
        price_cents=25000,
        tax_class="reduced",
        inventory_quantity=120,
        description=(
            "தமிழ்நாட்டின் நவீன வளர்ச்சிக்கும் சமூக முன்னேற்றத்திற்கும் திராவிட இயக்கம் ஆற்றிய பங்களிப்புகள் — பாகம் 2. || "
            "Dravidaththaal Vaazhkirom 2 (We Live by Dravidam Vol. 2) — Volume 2 exploring the transformative impact of "
            "Dravidian thought on modern Tamil Nadu's social justice and human development indicators."
        ),
        ingredients="முத்தமிழறிஞர் பதிப்பகம் | Muthamilarignar Pathipagam",
        safety_info="Paperback • Tamil • Ideology Series Vol. 2",
        image="https://s3.ap-south-1.amazonaws.com/storage.commonfolks.in/docs/products/images/dravidaththaal-vaazhkirom-2_FrontImage_655.gif",
    ),
    dict(
        name="கலைஞரும் நானும் | Kalaignarum Naanum (Vol. 1)",
        slug="kalaignarum-naanum",
        sku="MP-BOOK-020",
        category_slug="kalaignar-works",
        price_cents=20000,
        tax_class="reduced",
        inventory_quantity=130,
        description=(
            "முத்தமிழறிஞர் கலைஞருடனான தங்களின் பசுமையான நினைவுகளைப் பல்வேறு துறையினர் பகிர்ந்து கொள்ளும் நூல் — பாகம் 1. || "
            "Kalaignarum Naanum (Vol. 1) — Heartfelt tributes and personal accounts of Muthamilarignar Kalaignar's mentorship, "
            "humanity, and leadership across politics, literature, and cinema (Volume 1)."
        ),
        ingredients="முத்தமிழறிஞர் பதிப்பகம் | Muthamilarignar Pathipagam",
        safety_info="Paperback • Tamil • Memoirs Vol. 1",
        image="https://s3.ap-south-1.amazonaws.com/storage.commonfolks.in/docs/products/images/kalaignarum-naanum_FrontImage_107.gif",
    ),
    dict(
        name="திராவிடப் போராளிகள் | Dravida Poraligal (Vol. 1)",
        slug="dravida-poraligal",
        sku="MP-BOOK-021",
        category_slug="dravidian-history",
        price_cents=25000,
        tax_class="reduced",
        inventory_quantity=120,
        description=(
            "மொழிப்போர் மற்றும் சமூகநீதிப் போராட்டங்களில் இன்னுயிர் ஈந்த திராவிட இயக்கப் போராளிகளின் வரலாறு — பாகம் 1. || "
            "Dravida Poraligal (Vol. 1) — Volume 1 honoring the pioneers, martyrs, and ideological warriors who fought for "
            "self-respect, Tamil language rights, and social equality."
        ),
        ingredients="முத்தமிழறிஞர் பதிப்பகம் | Muthamilarignar Pathipagam",
        safety_info="Paperback • Tamil • Biographies Vol. 1",
        image="https://s3.ap-south-1.amazonaws.com/storage.commonfolks.in/docs/products/images/dravida-poraligal_FrontImage_795.gif",
    ),
    dict(
        name="இடம் பொருள் கலைஞர் | Idam Porul Kalaignar (Vol. 1)",
        slug="idam-porul-kalaignar",
        sku="MP-BOOK-022",
        category_slug="kalaignar-works",
        price_cents=20000,
        tax_class="reduced",
        inventory_quantity=130,
        description=(
            "முத்தமிழறிஞர் கலைஞரின் பன்முக ஆளுமையைக் காலத்தின் பின்னணியில் பதிவு செய்யும் சிறப்புக் கட்டுரைகள் — பாகம் 1. || "
            "Idam Porul Kalaignar (Vol. 1) — Volume 1 examining the multifaceted genius of Kalaignar M. Karunanidhi as "
            "playwright, orator, journalist, party builder, and five-time Chief Minister."
        ),
        ingredients="முத்தமிழறிஞர் பதிப்பகம் | Muthamilarignar Pathipagam",
        safety_info="Paperback • Tamil • Kalaignar Studies Vol. 1",
        image="https://s3.ap-south-1.amazonaws.com/storage.commonfolks.in/docs/products/images/idam-porul-kalaignar_FrontImage_819.gif",
    ),
    dict(
        name="உடன் பிறப்பே | Udan Pireppe (Vol. 1)",
        slug="udan-pireppe",
        sku="MP-BOOK-023",
        category_slug="kalaignar-works",
        price_cents=20000,
        tax_class="reduced",
        inventory_quantity=140,
        description=(
            "முரசொலியில் முத்தமிழறிஞர் கலைஞர் உடன்பிறப்புகளுக்குத் தீட்டிய வரலாற்றுக் கடிதங்களின் தொகுப்பு — பாகம் 1. || "
            "Udan Pireppe (Vol. 1) — Volume 1 of Kalaignar's legendary letters to party cadres in Murasoli, "
            "standing as a literary and political treasure of modern Tamil prose."
        ),
        ingredients="முத்தமிழறிஞர் பதிப்பகம் | Muthamilarignar Pathipagam",
        safety_info="Paperback • Tamil • Kalaignar Letters Vol. 1",
        image="https://s3.ap-south-1.amazonaws.com/storage.commonfolks.in/docs/products/images/udan-pireppe_FrontImage_596.gif",
    ),
    dict(
        name="தி.மு.க. வரலாறு (1949-1967) | D.M.K. Varalaru (1949-1967)",
        slug="d-m-k-varalaru-1949-1967",
        sku="MP-BOOK-024",
        category_slug="dravidian-history",
        price_cents=32000,
        tax_class="reduced",
        inventory_quantity=110,
        description=(
            "1949 ராபின்சன் பூங்கா தொடக்கம் முதல் 1967-ல் பேரறிஞர் அண்ணா தலைமையில் ஆட்சி அமைத்தது வரையிலான தி.மு.க.வின் அதிகாரப்பூர்வ வரலாறு. || "
            "D.M.K. Varalaru (1949–1967) — An authoritative historical chronicle of the Dravida Munnetra Kazhagam from its "
            "founding at Robinson Park in 1949 to its historic electoral victory under Perarignar Anna in 1967."
        ),
        ingredients="முத்தமிழறிஞர் பதிப்பகம் | Muthamilarignar Pathipagam",
        safety_info="Paperback • Tamil • Official Party History (1949–1967)",
        image="https://s3.ap-south-1.amazonaws.com/storage.commonfolks.in/docs/products/images/d-m-k-varalaru-1949-1967_FrontImage_778.jpg",
    ),
    dict(
        name="திராவிடத்தால் வாழ்கிறோம் 1 | Dravidaththaal Vaazhkirom 1",
        slug="dravidaththaal-vaazhkirom-1",
        sku="MP-BOOK-025",
        category_slug="dravidian-history",
        price_cents=25000,
        tax_class="reduced",
        inventory_quantity=125,
        description=(
            "திராவிட இயக்கம் தமிழ்ச் சமூகத்திற்குப் பெற்றுத் தந்த உரிமைகளையும் சமூக மாற்றங்களையும் விவரிக்கும் தொகுப்பு — பாகம் 1. || "
            "Dravidaththaal Vaazhkirom 1 (We Live by Dravidam Vol. 1) — Volume 1 of the acclaimed series detailing how "
            "Dravidian governance reshaped social mobility, education, and progressive politics in Tamil Nadu."
        ),
        ingredients="முத்தமிழறிஞர் பதிப்பகம் | Muthamilarignar Pathipagam",
        safety_info="Paperback • Tamil • Ideology Series Vol. 1",
        image="https://s3.ap-south-1.amazonaws.com/storage.commonfolks.in/docs/products/images/dravidaththaal-vaazhkirom_FrontImage_660.gif",
    ),
    dict(
        name="திராவிட சினிமா (முத்தமிழறிஞர் பதிப்பகம்) | Dravida Cinema (Vol. 1)",
        slug="dravida-cinema-muththamizharignar-pathippagam",
        sku="MP-BOOK-026",
        category_slug="dravidian-cinema-culture",
        price_cents=20000,
        tax_class="reduced",
        inventory_quantity=130,
        description=(
            "பராசக்தி உள்ளிட்ட காவியப் படைப்புகள் வழியாகத் திராவிட இயக்கம் தமிழ்ச் சினிமாவில் நிகழ்த்திய புரட்சி — பாகம் 1. || "
            "Dravida Cinema (Vol. 1) — Volume 1 exploring the golden era of Dravidian cinema, from Anna and Kalaignar's "
            "revolutionary screenplays like Parasakthi to the democratization of Tamil cultural expression."
        ),
        ingredients="முத்தமிழறிஞர் பதிப்பகம் | Muthamilarignar Pathipagam",
        safety_info="Paperback • Tamil • Cinema & Culture Vol. 1",
        image="https://s3.ap-south-1.amazonaws.com/storage.commonfolks.in/docs/products/images/dravida-cinema-muththamizharignar-pathippagam_FrontImage_780.gif",
    ),
    dict(
        name="டாக்டர் கலைஞர் | Doctor Kalaignar",
        slug="doctor-kalaignar",
        sku="MP-BOOK-027",
        category_slug="kalaignar-works",
        price_cents=10000,
        sale_price_cents=9500,
        tax_class="reduced",
        inventory_quantity=160,
        description=(
            "முத்தமிழறிஞர் டாக்டர் கலைஞர் மு. கருணாநிதி அவர்களின் வாழ்க்கை வரலாறு, போராட்டங்கள் மற்றும் சாதனைகளின் சுருக்கமான வரலாற்று நூல். || "
            "Doctor Kalaignar — A biographical tribute to Muthamilarignar Dr. Kalaignar M. Karunanidhi, tracing his "
            "extraordinary life from Thirukkuvalai to becoming the architect of modern Tamil Nadu."
        ),
        ingredients="முத்தமிழறிஞர் பதிப்பகம் | Muthamilarignar Pathipagam",
        safety_info="Paperback • Tamil • Biography",
        image="https://s3.ap-south-1.amazonaws.com/storage.commonfolks.in/docs/products/images/doctor-kalaignar_FrontImage_634.gif",
    ),
]

HOME_BLOCKS = [
    {
        "type": "hero",
        "data": {
            "eyebrow": "முத்தமிழறிஞர் பதிப்பகம் | Muthamilarignar Pathipagam",
            "title": "திராவிட இயக்க வரலாறு, சமூகநீதி மற்றும் கலைஞர் படைப்புகள்",
            "subtitle": "Official online bookstore for Muthamilarignar Pathipagam publications — exploring Dravidian history, social justice, state autonomy, and the works of Kalaignar.",
            "cta_label": "நூல்களைப் பார்வையிடுக | Browse Books",
            "cta_url": "/demo-store/products",
        },
    },
    {
        "type": "featured_products",
        "data": {"title": "சிறப்பு நூல்கள் | Featured Publications", "limit": 8},
    },
]


async def main() -> None:
    from sqlalchemy import delete, select, text

    from infalette_auth.security import PasswordHasher
    from infalette_database.base import Base
    from infalette_database.models.category import Category
    from infalette_database.models.discount_code import DiscountCode
    from infalette_database.models.page import Page, PageStatus
    from infalette_database.models.plan import Plan, PlanType
    from infalette_database.models.product import Product, ProductStatus
    from infalette_database.models.store import Store, StoreStatus
    from infalette_database.models.tenant import Tenant, TenantStatus
    from infalette_database.models.user import User, UserStatus
    from infalette_database.session import get_engine, get_session_factory

    engine = get_engine()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        if engine.dialect.name == "sqlite":
            # Normalize any legacy lowercase/uppercase enum strings in existing SQLite DBs
            await conn.execute(text("UPDATE tenants SET status = 'ACTIVE' WHERE lower(status) = 'active'"))
            await conn.execute(text("UPDATE users SET status = 'ACTIVE' WHERE lower(status) = 'active'"))
            await conn.execute(text("UPDATE users SET role = 'tenant_owner' WHERE lower(role) = 'tenant_owner'"))
            await conn.execute(text("UPDATE users SET role = 'platform_owner' WHERE lower(role) = 'platform_owner'"))
            await conn.execute(text("UPDATE stores SET status = 'PUBLISHED' WHERE lower(status) = 'published'"))
            await conn.execute(text("UPDATE products SET status = 'ACTIVE' WHERE lower(status) = 'active'"))
            await conn.execute(text("UPDATE pages SET status = 'PUBLISHED' WHERE lower(status) = 'published'"))

    created = []
    async with get_session_factory()() as s:
        # Plans
        plan_by_slug = {}
        for p in PLANS:
            row = (
                await s.execute(select(Plan).where(Plan.slug == p["slug"]))
            ).scalar_one_or_none()
            if not row:
                row = Plan(
                    name=p["name"],
                    slug=p["slug"],
                    plan_type=PlanType(p["slug"]),
                    price_cents=p["price_cents"],
                    currency="INR",
                    interval="month",
                    features_json={"description": p["description"]},
                )
                s.add(row)
                await s.flush()
                created.append(f"plan:{p['slug']}")
            plan_by_slug[p["slug"]] = row

        # Tenant
        tenant = (
            await s.execute(select(Tenant).where(Tenant.slug == TENANT_SLUG))
        ).scalar_one_or_none()
        if not tenant:
            tenant = Tenant(
                name="Muthamilarignar Pathipagam",
                slug=TENANT_SLUG,
                plan="store_automation",
                status=TenantStatus.ACTIVE,
            )
            s.add(tenant)
            await s.flush()
            created.append(f"tenant:{TENANT_SLUG}")
        else:
            tenant.name = "Muthamilarignar Pathipagam"
        if not tenant.plan_id:
            tenant.plan_id = plan_by_slug["store_automation"].id

        # Owner users (both documented staging owner and legacy test owner)
        owner_accounts = [
            (OWNER_EMAIL, OWNER_PASSWORD),
            ("owner@demo.infalette.com", os.environ.get("DEMO_OWNER_ALT_PASSWORD", "DemoOwner!2026")),
        ]
        for o_email, o_pw in owner_accounts:
            u_row = (
                await s.execute(select(User).where(User.email == o_email))
            ).scalar_one_or_none()
            if not u_row:
                u_row = User(
                    tenant_id=tenant.id,
                    email=o_email,
                    password_hash=PasswordHasher().hash_password(o_pw),
                    first_name="Muthamilarignar",
                    last_name="Pathipagam",
                    role="tenant_owner",
                    status=UserStatus.ACTIVE,
                )
                s.add(u_row)
                await s.flush()
                created.append(f"user:{o_email}")

        # Platform super-admin users (for apps/platform-admin)
        platform_accounts = [
            (
                os.environ.get("DEMO_PLATFORM_EMAIL", "admin@infalette.com"),
                os.environ.get("DEMO_PLATFORM_PASSWORD", "PlatformAdmin!2026"),
            ),
            ("admin@demo.test", "admin1234"),
        ]
        for p_email, p_pw in platform_accounts:
            puser = (
                await s.execute(select(User).where(User.email == p_email))
            ).scalar_one_or_none()
            if not puser:
                puser = User(
                    tenant_id=None,
                    email=p_email,
                    password_hash=PasswordHasher().hash_password(p_pw),
                    first_name="Platform",
                    last_name="Admin",
                    role="platform_owner",
                    status=UserStatus.ACTIVE,
                )
                s.add(puser)
                await s.flush()
                created.append(f"user:{p_email}")

        # Store
        store = (
            await s.execute(select(Store).where(Store.tenant_id == tenant.id))
        ).scalar_one_or_none()
        if not store:
            store = Store(
                tenant_id=tenant.id,
                name="Muthamilarignar Pathipagam",
                slug=f"{TENANT_SLUG}-main",
                description="முத்தமிழறிஞர் பதிப்பகம் — திராவிட இயக்க வரலாறு, சமூகநீதி மற்றும் கலைஞர் படைப்புகள் | Official Bookstore of Muthamilarignar Pathipagam.",
                logo_url="/logo.jpg",
                theme_config={"primary_color": "#dc2626", "secondary_color": "#0a0a0a"},
                status=StoreStatus.PUBLISHED,
                published_at=datetime.now(timezone.utc),
            )
            s.add(store)
            await s.flush()
            created.append("store")
        else:
            store.name = "Muthamilarignar Pathipagam"
            store.description = "முத்தமிழறிஞர் பதிப்பகம் — திராவிட இயக்க வரலாறு, சமூகநீதி மற்றும் கலைஞர் படைப்புகள் | Official Bookstore of Muthamilarignar Pathipagam."
            store.logo_url = "/logo.jpg"
            store.theme_config = {"primary_color": "#dc2626", "secondary_color": "#0a0a0a"}
            store.status = StoreStatus.PUBLISHED

        # Primary domain
        from infalette_database.models.domain import Domain

        dom = (
            await s.execute(
                select(Domain).where(
                    Domain.tenant_id == tenant.id,
                    Domain.domain == f"{TENANT_SLUG}.infalette.com",
                )
            )
        ).scalar_one_or_none()
        if not dom:
            s.add(
                Domain(
                    tenant_id=tenant.id,
                    domain=f"{TENANT_SLUG}.infalette.com",
                    is_primary=True,
                    verified=True,
                )
            )
            created.append(f"domain:{TENANT_SLUG}.infalette.com")

        # Categories
        cat_by_slug = {}
        for cdata in CATEGORIES:
            cat = (
                await s.execute(
                    select(Category).where(
                        Category.tenant_id == tenant.id,
                        Category.slug == cdata["slug"],
                    )
                )
            ).scalar_one_or_none()
            if not cat:
                cat = Category(
                    tenant_id=tenant.id,
                    name=cdata["name"],
                    slug=cdata["slug"],
                    description=cdata["description"],
                )
                s.add(cat)
                await s.flush()
                created.append(f"category:{cdata['slug']}")
            else:
                cat.name = cdata["name"]
                cat.description = cdata["description"]
            cat_by_slug[cdata["slug"]] = cat

        # Remove legacy baby/postpartum demo products (DEMO-*) so only books remain
        await s.execute(
            delete(Product).where(
                Product.tenant_id == tenant.id,
                Product.sku.like("DEMO-%"),
            )
        )

        # Seed all 27 Muthamilarignar Pathipagam books
        for pdata in PRODUCTS:
            exists = (
                await s.execute(
                    select(Product).where(
                        Product.tenant_id == tenant.id, Product.sku == pdata["sku"]
                    )
                )
            ).scalar_one_or_none()
            image_url = pdata["image"]
            cat_obj = cat_by_slug.get(pdata.get("category_slug", ""))
            cat_id = cat_obj.id if cat_obj else None

            if exists:
                exists.name = pdata["name"]
                exists.slug = pdata["slug"]
                exists.description = pdata["description"]
                exists.price_cents = pdata["price_cents"]
                exists.sale_price_cents = pdata.get("sale_price_cents")
                exists.tax_class = pdata["tax_class"]
                exists.inventory_quantity = pdata["inventory_quantity"]
                exists.inventory = pdata["inventory_quantity"]
                exists.image_url = image_url
                exists.images_json = [image_url]
                exists.ingredients = pdata.get("ingredients")
                exists.safety_info = pdata.get("safety_info")
                exists.category_id = cat_id
                exists.meta_title = pdata["name"]
                exists.meta_description = pdata["description"][:160]
                exists.status = ProductStatus.ACTIVE
                continue

            prod = Product(
                tenant_id=tenant.id,
                category_id=cat_id,
                name=pdata["name"],
                slug=pdata["slug"],
                sku=pdata["sku"],
                description=pdata["description"],
                price_cents=pdata["price_cents"],
                sale_price_cents=pdata.get("sale_price_cents"),
                tax_class=pdata["tax_class"],
                inventory_quantity=pdata["inventory_quantity"],
                inventory=pdata["inventory_quantity"],
                inventory_track=True,
                inventory_policy="deny",
                images_json=[image_url],
                image_url=image_url,
                ingredients=pdata.get("ingredients"),
                safety_info=pdata.get("safety_info"),
                meta_title=pdata["name"],
                meta_description=pdata["description"][:160],
                status=ProductStatus.ACTIVE,
            )
            s.add(prod)
            await s.flush()
            created.append(f"book:{pdata['sku']}")

        # Homepage page with blocks
        home = (
            await s.execute(
                select(Page).where(Page.tenant_id == tenant.id, Page.slug == "home")
            )
        ).scalar_one_or_none()
        if not home:
            home = Page(
                tenant_id=tenant.id,
                store_id=store.id,
                title="Muthamilarignar Pathipagam | முத்தமிழறிஞர் பதிப்பகம்",
                slug="home",
                path="/",
                blocks_json=HOME_BLOCKS,
                status=PageStatus.PUBLISHED,
                is_homepage=True,
                meta_title="Muthamilarignar Pathipagam | முத்தமிழறிஞர் பதிப்பகம் — Official Bookstore",
                meta_description="Official online bookstore for Muthamilarignar Pathipagam (முத்தமிழறிஞர் பதிப்பகம்) books on Dravidian history, social justice, and Kalaignar literature.",
            )
            s.add(home)
            created.append("page:home")
        else:
            home.title = "Muthamilarignar Pathipagam | முத்தமிழறிஞர் பதிப்பகம்"
            home.blocks_json = HOME_BLOCKS
            home.status = PageStatus.PUBLISHED
            home.meta_title = "Muthamilarignar Pathipagam | முத்தமிழறிஞர் பதிப்பகம் — Official Bookstore"
            home.meta_description = "Official online bookstore for Muthamilarignar Pathipagam (முத்தமிழறிஞர் பதிப்பகம்) books on Dravidian history, social justice, and Kalaignar literature."

        # Welcome coupon
        coupon = (
            await s.execute(
                select(DiscountCode).where(
                    DiscountCode.tenant_id == tenant.id,
                    DiscountCode.code == "WELCOME10",
                )
            )
        ).scalar_one_or_none()
        if not coupon:
            s.add(
                DiscountCode(
                    tenant_id=tenant.id,
                    code="WELCOME10",
                    discount_type="percentage",
                    value=10,
                    minimum_order_cents=20000,
                    is_active=True,
                    expires_at=datetime.now(timezone.utc).replace(
                        year=datetime.now(timezone.utc).year + 1
                    ),
                )
            )
            created.append("coupon:WELCOME10")

        await s.commit()

    print("Seed complete — Muthamilarignar Pathipagam Bookstore (27 books).")
    print(
        "  created :",
        ", ".join(created) if created else "(updated existing records)",
    )
    print("  login   :", f"{OWNER_EMAIL} / {OWNER_PASSWORD}")
    print("  storefront:", f"/{TENANT_SLUG}")
    print("  admin   : http://localhost:3001 (login with credentials above)")


if __name__ == "__main__":
    asyncio.run(main())
