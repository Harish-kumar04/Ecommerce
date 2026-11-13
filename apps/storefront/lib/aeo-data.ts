import { PUBLISHER_ENTITY, buildBreadcrumbNode, buildOrganizationNodes } from "@/lib/seo-schema";
import { SITE_URL } from "@/lib/site-defaults";

export const POLICY_LAST_UPDATED_ISO = "2026-11-13";
export const POLICY_LAST_UPDATED_EN = "November 13, 2026";
export const POLICY_LAST_UPDATED_TA = "13 நவம்பர் 2026";

export interface FaqEntry {
  id: string;
  questionTa: string;
  questionEn: string;
  /** Strictly 40–60 words, direct factual opening sentence = the answer. */
  answerEn: string;
  answerTa: string;
}

export const STORE_FAQS: FaqEntry[] = [
  {
    id: "who-is-muthamilarignar-pathipagam",
    questionTa: "முத்தமிழறிஞர் பதிப்பகம் என்பது யார்?",
    questionEn: "Who is Muthamilarignar Pathipagam?",
    answerEn:
      "Muthamilarignar Pathipagam (முத்தமிழறிஞர் பதிப்பகம்) is an official Tamil and English publishing house headquartered at Anna Arivalayam Campus, Teynampet, Chennai. The press publishes authentic editions on Dravidian movement history, social justice, constitutional federalism, language rights, the Dravidian Model of governance, and the literary and political works of Muthamilarignar Dr. Kalaignar M. Karunanidhi.",
    answerTa:
      "முத்தமிழறிஞர் பதிப்பகம் என்பது சென்னை தேனாம்பேட்டை அண்ணா அறிவாலய வளாகத்தை மையமாகக் கொண்டு செயல்படும் அதிகாரப்பூர்வ தமிழ் மற்றும் ஆங்கிலப் பதிப்பகமாகும். திராவிட இயக்க வரலாறு, சமூகநீதி, மாநில சுயாட்சி, மொழி உரிமை, திராவிட மாடல் ஆட்சி மற்றும் முத்தமிழறிஞர் டாக்டர் கலைஞர் மு. கருணாநிதி அவர்களின் இலக்கிய-வரலாற்றுப் படைப்புகளை அசல் பதிப்புகளாக வெளியிடுகிறது.",
  },
  {
    id: "which-kalaignar-books-available",
    questionTa: "முத்தமிழறிஞர் கலைஞர் தொடர்பான எந்தெந்த நூல்கள் இங்கு கிடைக்கின்றன?",
    questionEn: "Which books by Kalaignar are available?",
    answerEn:
      "Key works by and about Muthamilarignar Kalaignar available in our catalog include Tirukkural கலைஞர் உரை, குறளோவியம் (Kuraloviyam), தென்பாண்டிச் சிங்கம் (Thenpandi Singam), நெஞ்சுக்கு நீதி (Nenjukku Needhi), டாக்டர் கலைஞர் (Doctor Kalaignar), and காகிதப் பூ (Kagitha Poo). Browse the Kalaignar Works category online to check live stock, prices, and collector hardcover editions.",
    answerTa:
      "திருக்குறள் கலைஞர் உரை, குறளோவியம், தென்பாண்டிச் சிங்கம், நெஞ்சுக்கு நீதி, டாக்டர் கலைஞர் மற்றும் காகிதப் பூ உள்ளிட்ட முத்தமிழறிஞர் கலைஞர் அவர்களின் முதன்மைப் படைப்புகளும் வரலாற்று நூல்களும் எமது இணைய நூலகத்தில் கிடைக்கின்றன. கலைஞர் படைப்புகள் பிரிவில் கையிருப்பு, விலை மற்றும் சிறப்புப் பதிப்புகளை உடனடியாகக் காணலாம்.",
  },
  {
    id: "delivery-time",
    questionTa: "நூல்கள் எத்தனை நாட்களில் விநியோகிக்கப்படும்?",
    questionEn: "What is the delivery time for book orders?",
    answerEn:
      "Orders from Muthamilarignar Pathipagam are delivered within 3 to 6 business days across Tamil Nadu and 5 to 8 business days across the rest of India. Every parcel is packed in protective moisture-resistant wrapping and dispatched within 24 to 48 hours from Chennai with SMS and WhatsApp tracking updates until doorstep delivery.",
    answerTa:
      "முத்தமிழறிஞர் பதிப்பக ஆர்டர்கள் தமிழ்நாடு முழுவதும் 3 முதல் 6 வேலை நாட்களிலும், இந்தியாவின் பிற மாநிலங்களுக்கு 5 முதல் 8 வேலை நாட்களிலும் விநியோகிக்கப்படுகின்றன. ஒவ்வொரு நூலும் ஈரப்பதம் தாங்கும் பாதுகாப்பான உறையில் சென்னையிலிருந்து 24 முதல் 48 மணி நேரத்திற்குள் அனுப்பப்பட்டு கண்காணிப்புத் தகவல் வழங்கப்படுகிறது.",
  },
  {
    id: "cash-on-delivery",
    questionTa: "புத்தகம் நேரில் வந்ததும் பணம் செலுத்தும் வசதி (COD) உள்ளதா?",
    questionEn: "Is Cash on Delivery (COD) available?",
    answerEn:
      "Yes, Cash on Delivery (COD) is available on eligible Indian pincodes across Tamil Nadu and pan-India. Readers can place an order online without advance payment and pay the exact invoice amount in cash or UPI directly to the courier partner upon receiving their printed books at home, with zero hidden COD surcharges.",
    answerTa:
      "ஆம், தமிழ்நாடு மற்றும் இந்தியா முழுவதும் தகுதியுள்ள அஞ்சல் குறியீடுகளுக்குப் புத்தகம் நேரில் வந்ததும் பணம் செலுத்தும் வசதி (COD) உள்ளது. வாசகர்கள் முன்பணம் இன்றி இணையத்தில் ஆர்டர் செய்து, நூல்களை இல்லத்தில் பெறும்போது கூடுதல் கட்டணம் எதுவுமின்றி ரொக்கமாகவோ UPI மூலமாகவோ தொகையைச் செலுத்தலாம்.",
  },
  {
    id: "payment-options",
    questionTa: "என்னென்ன கட்டண முறைகள் ஏற்றுக்கொள்ளப்படுகின்றன?",
    questionEn: "What payment options are accepted?",
    answerEn:
      "Muthamilarignar Pathipagam accepts Cash on Delivery (COD) as well as instant online payments via UPI, GPay, PhonePe, Paytm, RuPay, Visa, Mastercard, and NetBanking through Razorpay. Printed books carry 0% GST in India, and orders of ₹500 or above automatically receive free pan-India shipping at checkout with instant order confirmation.",
    answerTa:
      "முத்தமிழறிஞர் பதிப்பகத்தில் ரொக்கப் பணம் செலுத்தும் வசதி (COD) மற்றும் Razorpay வழியாக UPI, GPay, PhonePe, Paytm, டெபிட்/கிரெடிட் கார்டுகள், நெட்பேங்கிங் ஆகிய அனைத்து இணையக் கட்டண முறைகளும் ஏற்றுக்கொள்ளப்படுகின்றன. அச்சிடப்பட்ட நூல்களுக்கு இந்தியாவில் 0% GST பொருந்தும்; ₹500-க்கு மேற்பட்ட ஆர்டர்களுக்கு இலவச விநியோகம் உண்டு.",
  },
  {
    id: "how-to-order",
    questionTa: "இணையதளத்தில் நூல்களை ஆர்டர் செய்வது எப்படி?",
    questionEn: "How do I order books from the website?",
    answerEn:
      "You can order books directly on our website by clicking Add to Cart or Buy Now on any title and completing single-page guest checkout. No mandatory account registration is required; simply enter your delivery name, mobile number, street address, and six-digit Indian pincode, then confirm via Cash on Delivery or online payment.",
    answerTa:
      "எந்தவொரு நூலிலும் 'கூடையில் சேர்' அல்லது 'இப்போதே வாங்குக' பொத்தானை அழுத்தி ஒற்றைப் பக்க செக்அவுட் வழியாக நேரடியாக ஆர்டர் செய்யலாம். கணக்குத் தொடங்க வேண்டிய கட்டாயமில்லை; உங்கள் பெயர், கைபேசி எண், முகவரி மற்றும் ஆறு இலக்க அஞ்சல் குறியீட்டை உள்ளிட்டு COD அல்லது ஆன்லைன் கட்டணம் மூலம் உறுதிப்படுத்தலாம்.",
  },
  {
    id: "returns-policy",
    questionTa: "சேதமடைந்த அல்லது தவறான நூல் வந்தால் மாற்றுவது எப்படி?",
    questionEn: "What is the return and replacement policy?",
    answerEn:
      "Damaged, misprinted, or incorrect books qualify for a free replacement or full refund within 7 days of delivery. Simply contact Muthamilarignar Pathipagam support on WhatsApp at +91 90033 24473 or email muthamilarignar@gmail.com with your order number and parcel photos, and our Chennai dispatch desk arranges prompt replacement or payment reversal.",
    answerTa:
      "போக்குவரத்தில் சேதமடைந்த, அச்சுப் பிழையுள்ள அல்லது தவறாக அனுப்பப்பட்ட நூல்களுக்கு விநியோகம் செய்யப்பட்ட 7 நாட்களுக்குள் இலவச மாற்றுப் பிரதி அல்லது முழுப் பணத்தைத் திரும்பப் பெறலாம். ஆர்டர் எண் மற்றும் புகைப்படங்களுடன் +91 90033 24473 என்ற WhatsApp எண்ணிற்கோ muthamilarignar@gmail.com என்ற மின்னஞ்சலுக்கோ தொடர்புகொள்ளலாம்.",
  },
];

export function buildFaqJsonLd(faqs: FaqEntry[], pageUrl?: string) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    ...(pageUrl ? { "@id": `${pageUrl}#faq` } : {}),
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: `${f.questionEn} (${f.questionTa})`,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.answerEn,
      },
    })),
  };
}

export interface AuthorProfile {
  slug: string;
  nameTa: string;
  nameEn: string;
  honorificTa: string;
  honorificEn: string;
  bioTa: string;
  bioEn: string;
  keywords: RegExp;
  sameAs: string[];
}

export const AUTHORS: AuthorProfile[] = [
  {
    slug: "muthamilarignar-kalaignar",
    nameTa: "முத்தமிழறிஞர் டாக்டர் கலைஞர் மு. கருணாநிதி",
    nameEn: "Muthamilarignar Dr. Kalaignar M. Karunanidhi",
    honorificTa: "முத்தமிழறிஞர் • ஐந்து முறை தமிழ்நாடு முதலமைச்சர் • எழுத்தாளர்",
    honorificEn: "Classical Tamil Scholar, Statesman & Five-Time Chief Minister of Tamil Nadu",
    bioTa:
      "முத்தமிழறிஞர் டாக்டர் கலைஞர் மு. கருணாநிதி (1924–2018) தமிழ் இலக்கியம், வரலாற்றுப் புதினம், திருக்குறள் உரை, நாடகம், திரைப்பட வசனம் மற்றும் சமூகநீதி அரசியல் ஆகிய துறைகளில் 75 ஆண்டுகளுக்கும் மேலாகப் பங்களித்த மாபெரும் படைப்பாளி. குறளோவியம், திருக்குறள் கலைஞர் உரை, நெஞ்சுக்கு நீதி, தென்பாண்டிச் சிங்கம், ரோமாபுரிப் பாண்டியன் உள்ளிட்ட நூற்றுக்கும் மேற்பட்ட நூல்களை எழுதியுள்ளார்.",
    bioEn:
      "Muthamilarignar Dr. Kalaignar M. Karunanidhi (1924–2018) was a towering Tamil literary figure, rationalist thinker, screenwriter, and five-time Chief Minister of Tamil Nadu. Across seven decades he authored landmark commentaries, historical novels, poetry, and memoirs including Tirukkural Kalaignar Urai, Kuraloviyam, Nenjukku Needhi, and Thenpandi Singam.",
    keywords: /kalaignar|karunanidhi|கலைஞர்|கருணாநிதி|குறள்|தென்பாண்டி|காகிதப் பூ/i,
    sameAs: [
      "https://en.wikipedia.org/wiki/M._Karunanidhi",
      ...PUBLISHER_ENTITY.sameAs,
    ],
  },
  {
    slug: "m-k-stalin",
    nameTa: "முத்துவேல் கருணாநிதி ஸ்டாலின்",
    nameEn: "M. K. Stalin",
    honorificTa: "தமிழ்நாடு முதலமைச்சர் • திராவிட மாடல் நாயகர்",
    honorificEn: "Chief Minister of Tamil Nadu & Proponent of the Dravidian Model",
    bioTa:
      "மாண்புமிகு தமிழ்நாடு முதலமைச்சர் மு. க. ஸ்டாலின் அவர்களின் உரைகள், வரலாற்றுப் பதிவுகள் மற்றும் சமூகநீதி-கூட்டாட்சி குறித்த 'திராவிட மாடல்' ஆட்சித் தத்துவ நூல்கள் முத்தமிழறிஞர் பதிப்பகத்தின் வழியாக வாசகர்களுக்கு வழங்கப்படுகின்றன.",
    bioEn:
      "M. K. Stalin serves as the Chief Minister of Tamil Nadu and President of the Dravida Munnetra Kazhagam. Publications covering his political journey, constitutional federalism speeches, and Tamil Nadu's inclusive Dravidian Model of governance are published and distributed through Muthamilarignar Pathipagam.",
    keywords: /stalin|ஸ்டாலின்|திராவிட மாடல்|dravidian model|மாநில சுயாட்சி|தமிழ்நாடு போராடும்/i,
    sameAs: [
      "https://en.wikipedia.org/wiki/M._K._Stalin",
      ...PUBLISHER_ENTITY.sameAs,
    ],
  },
  {
    slug: "dravidian-movement-scholars",
    nameTa: "திராவிட இயக்க வரலாற்று ஆய்வாளர்கள்",
    nameEn: "Dravidian Movement Historians & Editorial Collective",
    honorificTa: "முத்தமிழறிஞர் பதிப்பக ஆசிரியர் குழு",
    honorificEn: "Muthamilarignar Pathipagam Research & Editorial Board",
    bioTa:
      "தந்தை பெரியார், பேரறிஞர் அண்ணா, நீதிக்கட்சி முன்னோடிகள் மற்றும் சமூகநீதிப் போராட்ட வரலாற்றை ஆவணப்படுத்தும் ஆய்வாளர்கள் மற்றும் முத்தமிழறிஞர் பதிப்பக ஆசிரியர் குழுவின் தொகுப்பு நூல்கள்.",
    bioEn:
      "Historians, constitutional scholars, and the Muthamilarignar Pathipagam editorial collective documenting the Justice Party, Thanthai Periyar's Self-Respect Movement, Perarignar Anna's writings, reservation milestones, and linguistic federalism.",
    keywords: /திராவிட|சமூகநீதி|இந்தி|இடஒதுக்கீடு|dravid|varalaru|history/i,
    sameAs: [...PUBLISHER_ENTITY.sameAs],
  },
];

export function buildPersonJsonLd(tenant: string, author: AuthorProfile) {
  const homeUrl = `${SITE_URL}/${tenant}`;
  const authorUrl = `${homeUrl}/authors/${author.slug}`;
  const orgId = `${SITE_URL}/#organization`;

  return {
    "@context": "https://schema.org",
    "@graph": [
      ...buildOrganizationNodes(tenant),
      {
        "@type": "Person",
        "@id": `${authorUrl}#person`,
        name: author.nameEn,
        alternateName: author.nameTa,
        jobTitle: author.honorificEn,
        description: author.bioEn,
        url: authorUrl,
        affiliation: { "@id": orgId },
        sameAs: author.sameAs,
      },
      buildBreadcrumbNode(
        [
          { name: `${PUBLISHER_ENTITY.nameTa} | Home`, url: homeUrl },
          { name: "ஆசிரியர்கள் | Authors", url: `${homeUrl}/authors` },
          { name: `${author.nameTa} | ${author.nameEn}`, url: authorUrl },
        ],
        `${authorUrl}#breadcrumb`,
      ),
    ],
  };
}

export interface PolicyDoc {
  slug: "shipping" | "returns" | "privacy" | "terms";
  titleTa: string;
  titleEn: string;
  summaryEn: string;
  summaryTa: string;
  sections: Array<{ hTa: string; hEn: string; pTa: string; pEn: string }>;
}

export const POLICIES: Record<PolicyDoc["slug"], PolicyDoc> = {
  shipping: {
    slug: "shipping",
    titleTa: "விநியோகக் கொள்கை",
    titleEn: "Shipping & Delivery Policy",
    summaryEn:
      "Muthamilarignar Pathipagam dispatches authentic printed books from Chennai within 24–48 business hours. Delivery takes 3–6 business days in Tamil Nadu and 5–8 business days across India, with free shipping on orders of ₹500 or more.",
    summaryTa:
      "முத்தமிழறிஞர் பதிப்பக நூல்கள் சென்னையிலிருந்து 24–48 வேலை மணி நேரத்திற்குள் அனுப்பப்படுகின்றன. தமிழ்நாட்டிற்குள் 3–6 வேலை நாட்களிலும் பிற மாநிலங்களுக்கு 5–8 வேலை நாட்களிலும் விநியோகம் செய்யப்படுகிறது; ₹500-க்கு மேல் இலவச விநியோகம் உண்டு.",
    sections: [
      {
        hTa: "1. அனுப்புதல் மற்றும் விநியோகக் கால அளவு",
        hEn: "1. Dispatch & Transit Timelines",
        pTa: "உறுதி செய்யப்பட்ட அனைத்து ஆர்டர்களும் சென்னை தேனாம்பேட்டை மையத்திலிருந்து 24 முதல் 48 மணி நேரத்திற்குள் ஈரப்பதம் தாங்கும் பாதுகாப்பான பொதிகளில் அனுப்பப்படுகின்றன. தமிழ்நாட்டிற்குள் 3–6 வேலை நாட்களிலும், இந்தியாவின் பிற பகுதிகளுக்கு 5–8 வேலை நாட்களிலும் சென்றடையும்.",
        pEn: "All confirmed orders are packed in moisture-resistant protective sleeves and dispatched from our Teynampet, Chennai fulfillment desk within 24–48 business hours. Transit takes 3–6 business days across Tamil Nadu and 5–8 business days across the rest of India.",
      },
      {
        hTa: "2. விநியோகக் கட்டணம் மற்றும் இலவச விநியோகம்",
        hEn: "2. Shipping Charges & Free Delivery Threshold",
        pTa: "₹500 மற்றும் அதற்கு மேற்பட்ட மதிப்புள்ள ஆர்டர்களுக்கு இந்தியா முழுவதும் விநியோகம் முற்றிலும் இலவசம். ₹500-க்கும் குறைவான ஆர்டர்களுக்கு நிலையான விநியோகக் கட்டணம் செக்அவுட் பக்கத்தில் வெளிப்படையாகக் காட்டப்படும்.",
        pEn: "Orders totaling ₹500 or above receive free pan-India shipping automatically. Orders below ₹500 carry a flat transparent shipping fee displayed in your Order Summary prior to payment.",
      },
      {
        hTa: "3. கண்காணிப்பு மற்றும் உதவி",
        hEn: "3. Order Tracking & Support",
        pTa: "நூல் அனுப்பப்பட்டவுடன் கண்காணிப்பு விவரம் வழங்கப்படும். உதவிக்கு WhatsApp: +91 90033 24473 அல்லது muthamilarignar@gmail.com வழியாகத் தொடர்புகொள்ளலாம்.",
        pEn: "Tracking updates are shared once dispatched. For delivery assistance, reach Muthamilarignar Pathipagam at +91 90033 24473 (WhatsApp) or muthamilarignar@gmail.com.",
      },
    ],
  },
  returns: {
    slug: "returns",
    titleTa: "மாற்று மற்றும் பணம் திரும்பப் பெறும் கொள்கை",
    titleEn: "Returns, Replacements & Refunds Policy",
    summaryEn:
      "Readers may request a free replacement or full refund within 7 days of delivery for damaged, misprinted, missing-page, or wrong book shipments from Muthamilarignar Pathipagam.",
    summaryTa:
      "போக்குவரத்தில் சேதமடைந்த, அச்சுப் பிழையுள்ள அல்லது தவறாக அனுப்பப்பட்ட நூல்களுக்கு விநியோகம் செய்யப்பட்ட 7 நாட்களுக்குள் இலவச மாற்றுப் பிரதி அல்லது முழுப் பணத்தைத் திரும்பப் பெறலாம்.",
    sections: [
      {
        hTa: "1. தகுதியான மாற்றுக் கோரிக்கைகள்",
        hEn: "1. Eligibility for Replacement or Refund",
        pTa: "நூல் போக்குவரத்தில் சேதமடைந்திருந்தாலோ, பக்கங்கள் விடுபட்டிருந்தாலோ அல்லது வேறு நூல் அனுப்பப்பட்டிருந்தாலோ, பொருள் கிடைத்த 7 நாட்களுக்குள் ஆர்டர் எண் மற்றும் புகைப்படங்களுடன் தெரிவிக்கவும்.",
        pEn: "If your book arrives physically damaged in transit, has binding/printing defects, or differs from the ordered title, notify us within 7 calendar days of delivery with your order number and clear photos.",
      },
      {
        hTa: "2. பணம் திரும்பச் செலுத்தும் கால அளவு",
        hEn: "2. Refund Processing Timeline",
        pTa: "மாற்றுப் பிரதி உடனடியாகக் கட்டணமின்றி அனுப்பப்படும். பணம் திரும்பப் பெறும் நிகழ்வுகளில், ஆய்வு முடிந்த 5–7 வேலை நாட்களுக்குள் மூலக் கட்டண முறைக்கே (UPI / கார்டு / வங்கிக் கணக்கு) முழுத் தொகையும் திருப்பி அனுப்பப்படும்.",
        pEn: "Free replacement copies ship within 48 hours of approval. Approved refunds are credited back to the original payment method (or bank/UPI for COD orders) within 5–7 business days.",
      },
    ],
  },
  privacy: {
    slug: "privacy",
    titleTa: "தனியுரிமைக் கொள்கை",
    titleEn: "Privacy Policy",
    summaryEn:
      "Muthamilarignar Pathipagam collects only essential contact and delivery details required to fulfill book orders, issue GST/tax-exempt invoices, and provide order support under Indian data protection standards.",
    summaryTa:
      "முத்தமிழறிஞர் பதிப்பகம் நூல் விநியோகம், விலைப்பட்டியல் மற்றும் வாடிக்கையாளர் சேவைக்குத் தேவையான அடிப்படைத் தகவல்களை மட்டுமே பாதுகாப்பாகச் சேகரிக்கிறது.",
    sections: [
      {
        hTa: "1. சேகரிக்கப்படும் தகவல்கள்",
        hEn: "1. Information We Collect",
        pTa: "பெயர், கைபேசி எண், மின்னஞ்சல் மற்றும் விநியோக முகவரி ஆகியவை உங்கள் நூல் ஆர்டரை நிறைவேற்ற மட்டுமே பயன்படுத்தப்படுகின்றன. ஆன்லைன் கட்டணங்கள் Razorpay பாதுகாப்பான தளத்தின் வழியாக நடைபெறுகின்றன; கார்டு எண்கள் எமது சேவையகத்தில் சேமிக்கப்படுவதில்லை.",
        pEn: "We collect your name, phone number, email address, and shipping address solely to process and deliver your book orders. Online payments are processed via PCI-DSS compliant Razorpay; card credentials are never stored on our servers.",
      },
      {
        hTa: "2. தரவுப் பாதுகாப்பு மற்றும் உரிமைகள்",
        hEn: "2. Data Protection & Reader Rights",
        pTa: "உங்கள் தனிப்பட்ட தகவல்கள் மூன்றாம் தரப்பு விளம்பர நிறுவனங்களுக்கு விற்கப்படுவதில்லை. உங்கள் கணக்குத் தகவலைத் திருத்தவோ நீக்கவோ muthamilarignar@gmail.com என்ற மின்னஞ்சலுக்கு எழுதலாம்.",
        pEn: "We never sell or rent reader data to third-party marketers. You may review, update, or request deletion of your stored profile data anytime by emailing muthamilarignar@gmail.com.",
      },
    ],
  },
  terms: {
    slug: "terms",
    titleTa: "பயன்பாட்டு விதிமுறைகள்",
    titleEn: "Terms & Conditions",
    summaryEn:
      "All publications sold on this official storefront are authentic editions of Muthamilarignar Pathipagam, priced in Indian Rupees (INR) with 0% GST on printed books.",
    summaryTa:
      "இத்தளத்தில் விற்கப்படும் அனைத்து நூல்களும் முத்தமிழறிஞர் பதிப்பகத்தின் அதிகாரப்பூர்வப் பதிப்புகளாகும்; இந்திய ரூபாயில் (INR) 0% GST உடன் வழங்கப்படுகின்றன.",
    sections: [
      {
        hTa: "1. பதிப்புரிமை மற்றும் அசல் பதிப்புகள்",
        hEn: "1. Copyright & Authentic Editions",
        pTa: "இத்தளத்தில் இடம்பெற்றுள்ள நூல்கள், அட்டைப் படங்கள் மற்றும் உள்ளடக்கங்களின் பதிப்புரிமை முத்தமிழறிஞர் பதிப்பகத்திற்கு உரியது. அனுமதியின்றி மறுஅச்சு செய்வது சட்டப்படி தடுக்கப்பட்டுள்ளது.",
        pEn: "All book texts, cover designs, and catalog metadata are copyrighted publications of Muthamilarignar Pathipagam, Chennai. Unauthorized reproduction or commercial redistribution is prohibited.",
      },
      {
        hTa: "2. விலை மற்றும் கையிருப்பு",
        hEn: "2. Pricing, Stock & Order Confirmation",
        pTa: "அனைத்து விலைகளும் இந்திய ரூபாயில் (₹) குறிப்பிடப்பட்டுள்ளன. அச்சிடப்பட்ட நூல்களுக்கு 0% GST பொருந்தும். அதிகாரப்பூர்வ ஆர்டர் எண் உருவான பிறகே ஆர்டர் உறுதி செய்யப்படும்.",
        pEn: "All prices are listed in Indian Rupees (INR) and printed books carry 0% GST. Orders are confirmed upon generation of a verified server order ID, subject to live stock availability.",
      },
    ],
  },
};
