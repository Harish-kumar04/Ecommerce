export function getServerApiUrl(): string {
  const bound = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
  const trimmed = bound.replace(/\/$/, "");
  return trimmed.endsWith("/api/v1") ? trimmed : `${trimmed}/api/v1`;
}

export const FALLBACK_CATEGORIES = [
  {
    id: "cat-dravidian-history",
    name: "திராவிட இயக்க வரலாறு | Dravidian Movement History",
    slug: "dravidian-history",
    description:
      "Books on the history, ideology, and struggles of the Dravidian movement and DMK.",
  },
  {
    id: "cat-kalaignar-works",
    name: "கலைஞர் படைப்புகள் | Kalaignar Works & Studies",
    slug: "kalaignar-works",
    description:
      "Biographies, letters, literary works, and political analyses of Muthamilarignar Kalaignar M. Karunanidhi.",
  },
  {
    id: "cat-dravidian-model",
    name: "திராவிட மாடல் & சமூகநீதி | Dravidian Model & Social Justice",
    slug: "dravidian-model-social-justice",
    description:
      "Publications on the Dravidian Model governance, reservation, state autonomy, and language rights.",
  },
  {
    id: "cat-dravidian-cinema",
    name: "திராவிட சினிமா & பண்பாடு | Dravidian Cinema & Culture",
    slug: "dravidian-cinema-culture",
    description:
      "Explorations of Dravidian cinema, art, cultural transformation, and youth movement.",
  },
];

export const FALLBACK_STORE = {
  id: "store-muthamilarignar-pathipagam",
  name: "Muthamilarignar Pathipagam",
  slug: "demo-store-main",
  description:
    "முத்தமிழறிஞர் பதிப்பகம் — திராவிட இயக்க வரலாறு, சமூகநீதி மற்றும் கலைஞர் படைப்புகள் | Official Bookstore of Muthamilarignar Pathipagam.",
  logo_url: "/logo.jpg",
  currency: "INR",
  theme_config: { primary_color: "#E52320", secondary_color: "#0a0a0a" },
  status: "published",
};

export interface CatalogBook {
  id: string;
  name: string;
  slug: string;
  sku: string;
  category_id: string;
  price_cents: number;
  sale_price_cents?: number | null;
  tax_class: string;
  inventory: number;
  inventory_quantity: number;
  description: string;
  ingredients: string;
  safety_info: string;
  image_url: string;
  images: string[];
  status: string;
}

const RAW_BOOKS: Array<{
  sku: string;
  slug: string;
  name: string;
  category_id: string;
  price_cents: number;
  sale_price_cents?: number;
  description: string;
  safety_info: string;
  image: string;
}> = [
  {
    name: "காலத்தின் நிறம் கருப்பு சிவப்பு | Kaalatthin Niram Karuppu Sivappu",
    slug: "kaalatthin-niram-karuppu-sivappu",
    sku: "MP-BOOK-001",
    category_id: "cat-dravidian-history",
    price_cents: 75000,
    description:
      "காலத்தின் நிறம் கருப்பு சிவப்பு — தி.மு.க.வின் வரலாற்றுப் பயணம், சமூகநீதிப் போராட்டங்கள் மற்றும் திராவிட இயக்கத்தின் சாதனைகளைப் பதிவு செய்யும் சிறப்புப் பதிப்பு. || Kaalatthin Niram Karuppu Sivappu (The Colour of Time is Black & Red) — A landmark commemorative volume chronicling the historic journey, social justice struggles, and transformative achievements of the DMK and the Dravidian movement.",
    safety_info: "Hardcover / Collector's Edition • Tamil • Original Publisher Edition",
    image:
      "https://s3.ap-south-1.amazonaws.com/storage.commonfolks.in/docs/products/images/kaalatthin-niram-karuppu-sivappu_FrontImage_619.jpg",
  },
  {
    name: "இளைய திராவிடம் எழுகிறது | Ilaya Dravidam Ezhugirathu",
    slug: "ilaya-dravidam-ezhugirathu",
    sku: "MP-BOOK-002",
    category_id: "cat-dravidian-cinema",
    price_cents: 4000,
    description:
      "இளைய தலைமுறையினருக்குத் திராவிட இயக்கத்தின் கொள்கைகளையும் வரலாற்றையும் எளிமையாக எடுத்துரைக்கும் நூல். || Ilaya Dravidam Ezhugirathu (Young Dravidam Rises) — An inspiring handbook introducing the new generation to the foundational ideals, rationalism, and progressive vision of the Dravidian movement.",
    safety_info: "Paperback • Tamil • Youth & Ideology Series",
    image:
      "https://s3.ap-south-1.amazonaws.com/storage.commonfolks.in/docs/products/images/ilaya-dravidam-ezhugirathu_FrontImage_645.jpg",
  },
  {
    name: "இந்தியாவில் சமூகநீதியும் இடஒதுக்கீடும் ? | Indiavil Samuganithiyum Idaothikkidum?",
    slug: "indiavil-samuganithiyum-idaothikkidum",
    sku: "MP-BOOK-003",
    category_id: "cat-dravidian-model",
    price_cents: 4000,
    description:
      "இந்தியாவில் சமூகநீதி மற்றும் இடஒதுக்கீட்டு வரலாற்றை வினா-விடை வடிவில் தெளிவாக விளக்கும் நூல். || Indiavil Samuganithiyum Idaothikkidum? (Social Justice & Reservation in India) — A clear question-and-answer guide explaining constitutional reservation, social justice milestones, and Tamil Nadu's pioneering role.",
    safety_info: "Paperback • Tamil • Q&A Primer Series",
    image:
      "https://s3.ap-south-1.amazonaws.com/storage.commonfolks.in/docs/products/images/indiavil-samuganithiyum-idaothikkidum-kelvi-bathil_FrontImage_782.jpg",
  },
  {
    name: "இந்தியாவுக்கு வழிகாட்டும் திராவிட மாடல் | Indiavuku Vazhikatum Dravida Maadal",
    slug: "indiavuku-vazhikatum-dravida-maadal",
    sku: "MP-BOOK-004",
    category_id: "cat-dravidian-model",
    price_cents: 4000,
    description:
      "கல்வி, மருத்துவம், சமூகநலன் மற்றும் பொருளாதார வளர்ச்சியில் இந்தியாவுக்கே வழிகாட்டும் தமிழ்நாட்டின் 'திராவிட மாடல்' ஆட்சி முறை குறித்த நூல். || Indiavuku Vazhikatum Dravida Maadal (The Dravidian Model Guiding India) — An insightful overview of how Tamil Nadu's inclusive 'Dravidian Model' of governance leads India across education, healthcare, women's empowerment, and industrial growth.",
    safety_info: "Paperback • Tamil • Governance & Policy Series",
    image:
      "https://s3.ap-south-1.amazonaws.com/storage.commonfolks.in/docs/products/images/indiavuku-vazhikatum-dravida-maadal_FrontImage_189.jpg",
  },
  {
    name: "இந்தித் திணிப்பை எதிர்க்கிறோம்-ஏன்? | Hindhi Theenipai Ethirkirom - Yen?",
    slug: "hindhi-theenipai-ethirkirom-yen",
    sku: "MP-BOOK-005",
    category_id: "cat-dravidian-model",
    price_cents: 4000,
    description:
      "மொழி உரிமைப் போராட்ட வரலாறு மற்றும் இந்தித் திணிப்பைத் தமிழ்நாடு ஏன் தொடர்ந்து எதிர்க்கிறது என்பதை ஆதாரங்களுடன் விளக்கும் நூல். || Hindhi Theenipai Ethirkirom - Yen? (Why We Oppose Hindi Imposition) — A historical and constitutional account of Tamil Nadu's anti-Hindi imposition struggles, linguistic federalism, and the defense of mother-tongue rights.",
    safety_info: "Paperback • Tamil • Language Rights Series",
    image:
      "https://s3.ap-south-1.amazonaws.com/storage.commonfolks.in/docs/products/images/hindhi-theenipai-ethirkirom-yen_FrontImage_541.jpg",
  },
  {
    name: "திராவிட இயக்க வரலாறு - கேள்வி-பதில் | Dravida Iyakka Varalaru - Kelvi-Bathil",
    slug: "dravida-iyakka-varalaru-kelvi-bathil",
    sku: "MP-BOOK-006",
    category_id: "cat-dravidian-history",
    price_cents: 4000,
    description:
      "நீதிக்கட்சி காலம் முதல் திராவிட இயக்கத்தின் வளர்ச்சி வரை அனைவரும் அறிந்துகொள்ள வேண்டிய வரலாற்றுத் தகவல்கள் கேள்வி-பதில் வடிவில். || Dravida Iyakka Varalaru - Kelvi-Bathil (History of the Dravidian Movement Q&A) — Essential history of the Dravidian movement from the Justice Party and Self-Respect Movement to modern Tamil Nadu presented in an accessible Q&A format.",
    safety_info: "Paperback • Tamil • History Q&A Series",
    image:
      "https://s3.ap-south-1.amazonaws.com/storage.commonfolks.in/docs/products/images/dravida-iyakka-varalaru-kelvi-bathil_FrontImage_517.jpg",
  },
  {
    name: "மாநில சுயாட்சி முழக்கம் | Maanilla Suyatchi Muzhukkam",
    slug: "maanilla-suyatchi-muzhukkam",
    sku: "MP-BOOK-007",
    category_id: "cat-dravidian-model",
    price_cents: 4000,
    description:
      "மத்தியில் கூட்டாட்சி, மாநிலத்தில் சுயாட்சி என்ற முத்தமிழறிஞர் கலைஞரின் வரலாற்று முழக்கத்தையும் ராஜமன்னார் குழு அறிக்கையையும் விளக்கும் நூல். || Maanilla Suyatchi Muzhukkam (The Call for State Autonomy) — Explores the constitutional demand for true federalism, Kalaignar's historic State Autonomy resolution, and the Rajamannar Committee recommendations.",
    safety_info: "Paperback • Tamil • Federalism & Policy Series",
    image:
      "https://s3.ap-south-1.amazonaws.com/storage.commonfolks.in/docs/products/images/maanilla-suyatchi-muzhukkam_FrontImage_336.jpg",
  },
  {
    name: "தமிழ்நாடு போராடும் - தமிழ்நாடு வெல்லும் | Tamilnadu Poradum - Tamilnadu Vellum",
    slug: "tamilnadu-poradum-tamilnadu-vellum",
    sku: "MP-BOOK-008",
    category_id: "cat-dravidian-model",
    price_cents: 4000,
    description:
      "மாநில உரிமைகள், சமூகநீதி மற்றும் கூட்டாட்சித் தத்துவத்தைக் காக்க தமிழ்நாடு முன்னெடுக்கும் உரிமைப் போராட்டங்களின் தொகுப்பு. || Tamilnadu Poradum - Tamilnadu Vellum (Tamil Nadu Will Fight, Tamil Nadu Will Win) — A powerful chronicle of Tamil Nadu's unyielding democratic battles to safeguard state rights, social justice, and constitutional federalism.",
    safety_info: "Paperback • Tamil • Contemporary Politics",
    image:
      "https://s3.ap-south-1.amazonaws.com/storage.commonfolks.in/docs/products/images/tamilnadu-poradum-tamilnadu-vellum_FrontImage_976.jpg",
  },
  {
    name: "திராவிட சினிமா (பாகம் - 2) | Dravida Cinema (Vol. 2)",
    slug: "dravida-cinema-paagam-2",
    sku: "MP-BOOK-009",
    category_id: "cat-dravidian-cinema",
    price_cents: 15000,
    description:
      "தமிழ்த் திரையுலகில் திராவிட இயக்கப் படைப்பாளிகள் ஏற்படுத்திய சமூக மாற்றம் மற்றும் பகுத்தறிவுக் கருத்துக்களின் வரலாறு — பாகம் 2. || Dravida Cinema (Vol. 2) — Volume 2 examining how Dravidian movement screenwriters, lyricists, and filmmakers transformed Tamil cinema into a medium for social reform, Tamil pride, and rationalist thought.",
    safety_info: "Paperback • Tamil • Cinema & Culture Vol. 2",
    image:
      "https://s3.ap-south-1.amazonaws.com/storage.commonfolks.in/docs/products/images/dravida-cinema-paagam-2_FrontImage_476.jpg",
  },
  {
    name: "திராவிட மாடல் அரசு (பாகம் 2) | Dravida Model Arasu (Vol. 2)",
    slug: "dravida-model-arasu-paagam-2",
    sku: "MP-BOOK-010",
    category_id: "cat-dravidian-model",
    price_cents: 30000,
    description:
      "முத்துவேல் கருணாநிதி ஸ்டாலின் தலைமையிலான திராவிட மாடல் அரசின் முத்திரைத் திட்டங்கள் மற்றும் சாதனைகளின் விரிவான தொகுப்பு — பாகம் 2. || Dravida Model Arasu (Vol. 2) — Comprehensive documentation of the flagship welfare schemes, policy innovations, and socio-economic milestones of the Dravidian Model government (Volume 2).",
    safety_info: "Paperback • Tamil • Governance & Policy Vol. 2",
    image:
      "https://s3.ap-south-1.amazonaws.com/storage.commonfolks.in/docs/products/images/dravida-model-arasu-paagam-2_FrontImage_339.jpg",
  },
  {
    name: "திராவிடப் போராளிகள் (பாகம் 2) | Dravida Poraligal (Vol. 2)",
    slug: "dravida-poraligal-paagam-2",
    sku: "MP-BOOK-011",
    category_id: "cat-dravidian-history",
    price_cents: 15000,
    description:
      "திராவிட இயக்கத்திற்காகத் தம் வாழ்வை அர்ப்பணித்த களப் போராளிகள் மற்றும் முன்னோடிகளின் வாழ்க்கை வரலாறு — பாகம் 2. || Dravida Poraligal (Vol. 2) — Inspiring biographical portraits of the unsung warriors, leaders, and grassroots stalwarts who built and defended the Dravidian movement (Volume 2).",
    safety_info: "Paperback • Tamil • Biographies Vol. 2",
    image:
      "https://s3.ap-south-1.amazonaws.com/storage.commonfolks.in/docs/products/images/dravida-poraligal-paagam-2_FrontImage_992.jpg",
  },
  {
    name: "உடன் பிறப்பே (பாகம் 2) | Udan Pireppe (Vol. 2)",
    slug: "udan-pireppe-paagam-2",
    sku: "MP-BOOK-012",
    category_id: "cat-kalaignar-works",
    price_cents: 20000,
    description:
      "முத்தமிழறிஞர் கலைஞர் அவர்கள் கழக உடன்பிறப்புகளுக்கு எழுதிய வரலாற்றுச் சிறப்புமிக்க கடிதங்களின் தேர்ந்தெடுக்கப்பட்ட தொகுப்பு — பாகம் 2. || Udan Pireppe (Vol. 2) — Volume 2 of Muthamilarignar Kalaignar's iconic 'Dear Brethren' epistolary essays, blending political philosophy, literature, history, and organizational guidance.",
    safety_info: "Paperback • Tamil • Kalaignar Letters Vol. 2",
    image:
      "https://s3.ap-south-1.amazonaws.com/storage.commonfolks.in/docs/products/images/udan-pireppe-paagam-2_FrontImage_577.jpg",
  },
  {
    name: "இடம் பொருள் கலைஞர் (பாகம் 2) | Idam Porul Kalaignar (Vol. 2)",
    slug: "idam-porul-kalaignar-paagam-2",
    sku: "MP-BOOK-013",
    category_id: "cat-kalaignar-works",
    price_cents: 15000,
    description:
      "முத்தமிழறிஞர் கலைஞரின் அரசியல், இலக்கியம் மற்றும் ஆளுமைத் திறனைப் பல்வேறு கோணங்களில் ஆராயும் கட்டுரைத் தொகுப்பு — பாகம் 2. || Idam Porul Kalaignar (Vol. 2) — Volume 2 capturing the wit, statesmanship, literary mastery, and historical interventions of Kalaignar M. Karunanidhi across decades of public life.",
    safety_info: "Paperback • Tamil • Kalaignar Studies Vol. 2",
    image:
      "https://s3.ap-south-1.amazonaws.com/storage.commonfolks.in/docs/products/images/idam-porul-kalaignar-paagam-2_FrontImage_282.jpg",
  },
  {
    name: "கலைஞர் இயக்கவியல் | Kalaignar Iyakkaviyal",
    slug: "kalaignar-iyakkaviyal",
    sku: "MP-BOOK-014",
    category_id: "cat-kalaignar-works",
    price_cents: 20000,
    description:
      "நவீன தமிழ்நாட்டைக் கட்டமைத்த முத்தமிழறிஞர் கலைஞரின் தத்துவார்த்த மற்றும் செயல்முறை இயக்கவியலை ஆராயும் நூல். || Kalaignar Iyakkaviyal (The Dialectics of Kalaignar) — An analytical study of Kalaignar M. Karunanidhi's political philosophy, ideological resilience, administrative statecraft, and social reform legacy.",
    safety_info: "Paperback • Tamil • Political Philosophy",
    image:
      "https://s3.ap-south-1.amazonaws.com/storage.commonfolks.in/docs/products/images/kalaignar-iyakkaviyal_FrontImage_350.jpg",
  },
  {
    name: "கலைஞரும் நானும் (பாகம் 2) | Kalaignarum Naanum (Vol. 2)",
    slug: "kalaignarum-naanum-paagam-2",
    sku: "MP-BOOK-015",
    category_id: "cat-kalaignar-works",
    price_cents: 15000,
    description:
      "முத்தமிழறிஞர் கலைஞருடனான மறக்க முடியாத அனுபவங்களையும் நினைவுகளையும் ஆளுமைகள் பகிர்ந்து கொள்ளும் நூல் — பாகம் 2. || Kalaignarum Naanum (Vol. 2) — Personal memoirs and intimate recollections by eminent leaders, writers, and contemporaries on their journey alongside Muthamilarignar Kalaignar (Volume 2).",
    safety_info: "Paperback • Tamil • Memoirs Vol. 2",
    image:
      "https://s3.ap-south-1.amazonaws.com/storage.commonfolks.in/docs/products/images/kalaignarum-naanum-paagam-2_FrontImage_139.jpg",
  },
  {
    name: "திமுக இளைஞரணி அத்தியாயம் - 1 | DMK Ilaignarani Athiyayam - 1",
    slug: "dmk-ilaignarani-athiyayam-1",
    sku: "MP-BOOK-016",
    category_id: "cat-dravidian-history",
    price_cents: 35000,
    description:
      "ஜான்சி ராணி பூங்காவில் தொடங்கிய தி.மு.க. இளைஞரணியின் உருவாக்கம், போராட்டங்கள் மற்றும் வளர்ச்சிப் பாதையின் வரலாற்று ஆவணம் — அத்தியாயம் 1. || DMK Ilaignarani Athiyayam - 1 (DMK Youth Wing Chapter 1) — A richly illustrated historical volume documenting the founding of the DMK Youth Wing in Madurai (1980) and its evolution into a premier ideological force.",
    safety_info: "Deluxe Paperback • Tamil • Youth Wing History",
    image:
      "https://s3.ap-south-1.amazonaws.com/storage.commonfolks.in/docs/products/images/dmk-ilaignarani-athiyayam-1_FrontImage_756.jpg",
  },
  {
    name: "திராவிடத்தால் வாழ்கிறோம் 3 | Dravidaththaal Vaazhkirom (Vol. 3)",
    slug: "dravidaththaal-vaazhkirom-3",
    sku: "MP-BOOK-017",
    category_id: "cat-dravidian-history",
    price_cents: 25000,
    description:
      "திராவிட இயக்கம் தமிழ்ச் சமூகத்தின் கல்வி, வேலைவாய்ப்பு மற்றும் சுயமரியாதையை எவ்வாறு உயர்த்தியது என்பதை விளக்கும் கட்டுரைத் தொகுப்பு — பாகம் 3. || Dravidaththaal Vaazhkirom (Vol. 3) — Volume 3 of essays illustrating how a century of Dravidian movement policies uplifted Tamil society through education, social dignity, and equitable growth.",
    safety_info: "Paperback • Tamil • Ideology Series Vol. 3",
    image:
      "https://s3.ap-south-1.amazonaws.com/storage.commonfolks.in/docs/products/images/dravidaththaal-vaazhkirom-3_FrontImage_946.jpg",
  },
  {
    name: "திராவிட மாடல் அரசு | Dravida Model Arasu (Vol. 1)",
    slug: "dravida-model-arasu",
    sku: "MP-BOOK-018",
    category_id: "cat-dravidian-model",
    price_cents: 30000,
    description:
      "சமூகநீதி, சமத்துவம், சுயமரியாதை மற்றும் எல்லோருக்கும் எல்லாம் என்ற திராவிட மாடல் அரசின் சாதனைத் தொகுப்பு — பாகம் 1. || Dravida Model Arasu (Vol. 1) — Volume 1 detailing the foundational principles and landmark welfare achievements of the Dravidian Model government under Chief Minister M. K. Stalin.",
    safety_info: "Paperback • Tamil • Governance & Policy Vol. 1",
    image:
      "https://s3.ap-south-1.amazonaws.com/storage.commonfolks.in/docs/products/images/dravida-model-arasu_FrontImage_297.gif",
  },
  {
    name: "திராவிடத்தால் வாழ்கிறோம் 2 | Dravidaththaal Vaazhkirom (Vol. 2)",
    slug: "dravidaththaal-vaazhkirom-2",
    sku: "MP-BOOK-019",
    category_id: "cat-dravidian-history",
    price_cents: 25000,
    description:
      "தமிழ்நாட்டின் நவீன வளர்ச்சிக்கும் சமூக முன்னேற்றத்திற்கும் திராவிட இயக்கம் ஆற்றிய பங்களிப்புகள் — பாகம் 2. || Dravidaththaal Vaazhkirom (Vol. 2) — Volume 2 exploring the transformative impact of Dravidian thought on modern Tamil Nadu's social justice and human development indicators.",
    safety_info: "Paperback • Tamil • Ideology Series Vol. 2",
    image:
      "https://s3.ap-south-1.amazonaws.com/storage.commonfolks.in/docs/products/images/dravidaththaal-vaazhkirom-2_FrontImage_655.gif",
  },
  {
    name: "கலைஞரும் நானும் | Kalaignarum Naanum (Vol. 1)",
    slug: "kalaignarum-naanum",
    sku: "MP-BOOK-020",
    category_id: "cat-kalaignar-works",
    price_cents: 20000,
    description:
      "முத்தமிழறிஞர் கலைஞருடனான தங்களின் பசுமையான நினைவுகளைப் பல்வேறு துறையினர் பகிர்ந்து கொள்ளும் நூல் — பாகம் 1. || Kalaignarum Naanum (Vol. 1) — Heartfelt tributes and personal accounts of Muthamilarignar Kalaignar's mentorship, humanity, and leadership across politics, literature, and cinema (Volume 1).",
    safety_info: "Paperback • Tamil • Memoirs Vol. 1",
    image:
      "https://s3.ap-south-1.amazonaws.com/storage.commonfolks.in/docs/products/images/kalaignarum-naanum_FrontImage_107.gif",
  },
  {
    name: "திராவிடப் போராளிகள் | Dravida Poraligal (Vol. 1)",
    slug: "dravida-poraligal",
    sku: "MP-BOOK-021",
    category_id: "cat-dravidian-history",
    price_cents: 25000,
    description:
      "மொழிப்போர் மற்றும் சமூகநீதிப் போராட்டங்களில் இன்னுயிர் ஈந்த திராவிட இயக்கப் போராளிகளின் வரலாறு — பாகம் 1. || Dravida Poraligal (Vol. 1) — Volume 1 honoring the pioneers, martyrs, and ideological warriors who fought for self-respect, Tamil language rights, and social equality.",
    safety_info: "Paperback • Tamil • Biographies Vol. 1",
    image:
      "https://s3.ap-south-1.amazonaws.com/storage.commonfolks.in/docs/products/images/dravida-poraligal_FrontImage_795.gif",
  },
  {
    name: "இடம் பொருள் கலைஞர் | Idam Porul Kalaignar (Vol. 1)",
    slug: "idam-porul-kalaignar",
    sku: "MP-BOOK-022",
    category_id: "cat-kalaignar-works",
    price_cents: 20000,
    description:
      "முத்தமிழறிஞர் கலைஞரின் பன்முக ஆளுமையைக் காலத்தின் பின்னணியில் பதிவு செய்யும் சிறப்புக் கட்டுரைகள் — பாகம் 1. || Idam Porul Kalaignar (Vol. 1) — Volume 1 examining the multifaceted genius of Kalaignar M. Karunanidhi as playwright, orator, journalist, party builder, and five-time Chief Minister.",
    safety_info: "Paperback • Tamil • Kalaignar Studies Vol. 1",
    image:
      "https://s3.ap-south-1.amazonaws.com/storage.commonfolks.in/docs/products/images/idam-porul-kalaignar_FrontImage_819.gif",
  },
  {
    name: "உடன் பிறப்பே | Udan Pireppe (Vol. 1)",
    slug: "udan-pireppe",
    sku: "MP-BOOK-023",
    category_id: "cat-kalaignar-works",
    price_cents: 20000,
    description:
      "முரசொலியில் முத்தமிழறிஞர் கலைஞர் உடன்பிறப்புகளுக்குத் தீட்டிய வரலாற்றுக் கடிதங்களின் தொகுப்பு — பாகம் 1. || Udan Pireppe (Vol. 1) — Volume 1 of Kalaignar's legendary letters to party cadres in Murasoli, standing as a literary and political treasure of modern Tamil prose.",
    safety_info: "Paperback • Tamil • Kalaignar Letters Vol. 1",
    image:
      "https://s3.ap-south-1.amazonaws.com/storage.commonfolks.in/docs/products/images/udan-pireppe_FrontImage_596.gif",
  },
  {
    name: "தி.மு.க. வரலாறு (1949-1967) | D.M.K. Varalaru (1949-1967)",
    slug: "d-m-k-varalaru-1949-1967",
    sku: "MP-BOOK-024",
    category_id: "cat-dravidian-history",
    price_cents: 32000,
    description:
      "1949 ராபின்சன் பூங்கா தொடக்கம் முதல் 1967-ல் பேரறிஞர் அண்ணா தலைமையில் ஆட்சி அமைத்தது வரையிலான தி.மு.க.வின் அதிகாரப்பூர்வ வரலாறு. || D.M.K. Varalaru (1949–1967) — An authoritative historical chronicle of the Dravida Munnetra Kazhagam from its founding at Robinson Park in 1949 to its historic electoral victory under Perarignar Anna in 1967.",
    safety_info: "Paperback • Tamil • Official Party History (1949–1967)",
    image:
      "https://s3.ap-south-1.amazonaws.com/storage.commonfolks.in/docs/products/images/d-m-k-varalaru-1949-1967_FrontImage_778.jpg",
  },
  {
    name: "திராவிடத்தால் வாழ்கிறோம் 1 | Dravidaththaal Vaazhkirom (Vol. 1)",
    slug: "dravidaththaal-vaazhkirom-1",
    sku: "MP-BOOK-025",
    category_id: "cat-dravidian-history",
    price_cents: 25000,
    description:
      "திராவிட இயக்கம் தமிழ்ச் சமூகத்திற்குப் பெற்றுத் தந்த உரிமைகளையும் சமூக மாற்றங்களையும் விவரிக்கும் தொகுப்பு — பாகம் 1. || Dravidaththaal Vaazhkirom (Vol. 1) — Volume 1 of the acclaimed series detailing how Dravidian governance reshaped social mobility, education, and progressive politics in Tamil Nadu.",
    safety_info: "Paperback • Tamil • Ideology Series Vol. 1",
    image:
      "https://s3.ap-south-1.amazonaws.com/storage.commonfolks.in/docs/products/images/dravidaththaal-vaazhkirom_FrontImage_660.gif",
  },
  {
    name: "திராவிட சினிமா (முத்தமிழறிஞர் பதிப்பகம்) | Dravida Cinema (Vol. 1)",
    slug: "dravida-cinema-muththamizharignar-pathippagam",
    sku: "MP-BOOK-026",
    category_id: "cat-dravidian-cinema",
    price_cents: 20000,
    description:
      "பராசக்தி உள்ளிட்ட காவியப் படைப்புகள் வழியாகத் திராவிட இயக்கம் தமிழ்ச் சினிமாவில் நிகழ்த்திய புரட்சி — பாகம் 1. || Dravida Cinema (Vol. 1) — Volume 1 exploring the golden era of Dravidian cinema, from Anna and Kalaignar's revolutionary screenplays like Parasakthi to the democratization of Tamil cultural expression.",
    safety_info: "Paperback • Tamil • Cinema & Culture Vol. 1",
    image:
      "https://s3.ap-south-1.amazonaws.com/storage.commonfolks.in/docs/products/images/dravida-cinema-muththamizharignar-pathippagam_FrontImage_780.gif",
  },
  {
    name: "டாக்டர் கலைஞர் | Doctor Kalaignar",
    slug: "doctor-kalaignar",
    sku: "MP-BOOK-027",
    category_id: "cat-kalaignar-works",
    price_cents: 10000,
    sale_price_cents: 9500,
    description:
      "முத்தமிழறிஞர் டாக்டர் கலைஞர் மு. கருணாநிதி அவர்களின் வாழ்க்கை வரலாறு, போராட்டங்கள் மற்றும் சாதனைகளின் சுருக்கமான வரலாற்று நூல். || Doctor Kalaignar — A biographical tribute to Muthamilarignar Dr. Kalaignar M. Karunanidhi, tracing his extraordinary life from Thirukkuvalai to becoming the architect of modern Tamil Nadu.",
    safety_info: "Paperback • Tamil • Biography",
    image:
      "https://s3.ap-south-1.amazonaws.com/storage.commonfolks.in/docs/products/images/doctor-kalaignar_FrontImage_634.gif",
  },
];

export const FALLBACK_BOOKS: CatalogBook[] = RAW_BOOKS.map((b) => ({
  id: b.slug,
  name: b.name,
  slug: b.slug,
  sku: b.sku,
  category_id: b.category_id,
  price_cents: b.price_cents,
  sale_price_cents: b.sale_price_cents ?? null,
  tax_class: "reduced",
  inventory: 150,
  inventory_quantity: 150,
  description: b.description,
  ingredients: "முத்தமிழறிஞர் பதிப்பகம் | Muthamilarignar Pathipagam",
  safety_info: b.safety_info,
  image_url: b.image,
  images: [b.image],
  status: "active",
}));

export async function fetchBooksSafe(tenant: string): Promise<{ books: any[]; isFallback: boolean }> {
  try {
    const res = await fetch(`${getServerApiUrl()}/public/products`, {
      headers: { "X-Tenant": tenant },
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) {
      const data = await res.json();
      const list = Array.isArray(data) ? data : data?.data || [];
      return { books: list, isFallback: false };
    }
    if (res.status === 404) {
      return { books: [], isFallback: false };
    }
  } catch (err) {
    // API is unreachable (network error or timeout)
  }
  return { books: FALLBACK_BOOKS, isFallback: true };
}

export async function getBooksWithFallback(tenant: string) {
  const result = await fetchBooksSafe(tenant);
  return result.books;
}

export async function getCategoriesWithFallback(tenant: string) {
  try {
    const res = await fetch(`${getServerApiUrl()}/public/categories`, {
      headers: { "X-Tenant": tenant },
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) {
      const data = await res.json();
      const list = Array.isArray(data) ? data : data?.data || [];
      return list;
    }
    if (res.status === 404) {
      return [];
    }
  } catch {
    // Fallback on network/5xx error
  }
  return FALLBACK_CATEGORIES;
}

export async function getStoreWithFallback(tenant: string) {
  try {
    const res = await fetch(`${getServerApiUrl()}/public/store`, {
      headers: { "X-Tenant": tenant },
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) {
      const data = await res.json();
      const store = Array.isArray(data) ? data[0] : data?.data?.[0] || data;
      if (store?.id) return store;
    }
  } catch {
    // Fallback
  }
  return FALLBACK_STORE;
}

export type BookLookupResult =
  | { status: "ok"; product: any }
  | { status: "not_found" }
  | { status: "error"; httpStatus?: number };

export async function fetchBookById(
  tenant: string,
  productIdOrSlug: string,
): Promise<BookLookupResult> {
  const url = `${getServerApiUrl()}/public/products/${encodeURIComponent(productIdOrSlug)}`;
  let lastHttpStatus: number | undefined;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { "X-Tenant": tenant },
        next: { revalidate: 60 },
        signal: AbortSignal.timeout(8000),
      });
      console.info(
        `[getBookById] tenant=${tenant} id=${productIdOrSlug} status=${res.status} attempt=${attempt}`,
      );

      if (res.ok) {
        const prod = await res.json();
        if (prod?.id) {
          return { status: "ok", product: prod };
        }
      }

      if (res.status === 404) {
        return { status: "not_found" };
      }

      lastHttpStatus = res.status;
      if (res.status >= 500 && attempt === 1) {
        await new Promise((r) => setTimeout(r, 350));
        continue;
      }
      return { status: "error", httpStatus: res.status };
    } catch (err: any) {
      console.warn(
        `[getBookById] tenant=${tenant} id=${productIdOrSlug} status=NETWORK_OR_TIMEOUT attempt=${attempt} error=${err?.message || err}`,
      );
      if (attempt === 1) {
        await new Promise((r) => setTimeout(r, 350));
        continue;
      }
    }
  }

  // If the single-book endpoint timed out or hit a 5xx burst (e.g. during SSG),
  // check the cached live API list (never the static fallback) before showing "try again".
  const listRes = await fetchBooksSafe(tenant);
  if (!listRes.isFallback) {
    const key = productIdOrSlug.toLowerCase();
    const match = listRes.books.find(
      (b: any) =>
        String(b?.id || "").toLowerCase() === key ||
        String(b?.slug || "").toLowerCase() === key,
    );
    if (match?.id) {
      return { status: "ok", product: match };
    }
  }

  return { status: "error", httpStatus: lastHttpStatus };
}

export async function getBookByIdWithFallback(
  tenant: string,
  productIdOrSlug: string,
) {
  const res = await fetchBookById(tenant, productIdOrSlug);
  if (res.status === "ok") return res.product;
  return null;
}

