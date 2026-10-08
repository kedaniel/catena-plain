/** Interface copy for the two versions. The Arabic version renders right-to-left. */
export type Profile = "full" | "arabic";

export const UI = {
  full: {
    dir: "ltr" as const,
    titleA: "Theobiblia",
    titleB: "Translator",
    tagline:
      "Choose a verse, pick a Church Father, and read his commentary in plain language — with the hard words explained, the verses he cites, and his main point.",
    signOut: "Sign out",
    codeLabel: "Access code",
    codePlaceholder: "Enter the code you were given",
    continue: "Continue",
    codeHint: "This app is shared with a small study group. Ask whoever sent you the link for the code.",
    tabVerse: "By verse",
    tabText: "Paste text",
    book: "Book",
    chooseBook: "Choose a book…",
    chapter: "Chapter",
    verse: "Verse",
    find: "Find Fathers",
    finding: "Looking…",
    orLink: "Or paste a Catena link",
    linkPlaceholder: "https://catenabible.com/…",
    pickOne: (n: number) => `${n} commentar${n === 1 ? "y" : "ies"} — pick one`,
    moreHint:
      'Catena shows more commentaries behind its "Show more" button than appear here. For one of those, open it in Catena and paste its link above.',
    language: "Language",
    langEn: "English",
    langAr: "العربية",
    langBoth: "Both",
    textPlaceholder: "Paste the commentary text here…",
    makePlain: "Make it plain",
    redo: "Redo in this language",
    stop: "Stop",
    out: "Plain version",
    example: "Example",
    saved: "Saved earlier",
    copy: "Copy",
    copied: "Copied.",
    copyFail: "Couldn't copy. Select the text and copy it instead.",
    thinking: "Reading the Father",
    idle: "Pick a Father on the left to see his commentary in plain language.",
    note:
      "The plain version can soften careful theological wording. Keep the original beside it, and check anything that sounds surprising against the source or ask a priest.",
    needBook: "Choose a book, chapter and verse.",
    needFather: "Choose a Father first.",
    needText: "Paste the commentary text first.",
    noneFound: "No commentaries found for that verse.",
    offline: "Couldn't reach the app. Check your connection.",
    generic: "Something went wrong. Try again.",
    stopped: "Stopped.",
    badCode: "That code didn't work.",
    reenter: "Please enter the access code again.",
  },
  arabic: {
    dir: "rtl" as const,
    titleA: "ثيوبيبليا",
    titleB: "المترجم",
    tagline: "اختر الآية، ثم اختر أحد الآباء، لتقرأ تفسيره بلغة بسيطة: شرح الكلمات الصعبة، والآيات المذكورة، والفكرة الرئيسية.",
    signOut: "تسجيل الخروج",
    codeLabel: "رمز الدخول",
    codePlaceholder: "أدخل الرمز الذي أُعطي لك",
    continue: "متابعة",
    codeHint: "هذا التطبيق مُشارك مع مجموعة دراسة صغيرة. اطلب الرمز من الشخص الذي أرسل لك الرابط.",
    tabVerse: "بالآية",
    tabText: "لصق النص",
    book: "السفر",
    chooseBook: "اختر السفر…",
    chapter: "الإصحاح",
    verse: "الآية",
    find: "ابحث عن الآباء",
    finding: "جاري البحث…",
    orLink: "أو الصق رابطًا من Catena",
    linkPlaceholder: "https://catenabible.com/…",
    pickOne: (n: number) => `${n} تفسير — اختر واحدًا`,
    moreHint:
      'يعرض Catena تفاسير أكثر من الظاهرة هنا خلف زر "Show more". للحصول على أحدها، افتحه في Catena والصق رابطه أعلاه.',
    language: "اللغة",
    langEn: "English",
    langAr: "العربية",
    langBoth: "الاثنان",
    textPlaceholder: "الصق نص التفسير هنا…",
    makePlain: "بسّط النص",
    redo: "أعد التبسيط",
    stop: "إيقاف",
    out: "النص المبسّط",
    example: "مثال",
    saved: "محفوظ مسبقًا",
    copy: "نسخ",
    copied: "تم النسخ.",
    copyFail: "لم يتم النسخ. حدد النص وانسخه يدويًا.",
    thinking: "جاري قراءة التفسير",
    idle: "اختر أحد الآباء لتقرأ تفسيره بلغة بسيطة.",
    note: "التبسيط قد يُخفّف دقة الصياغة اللاهوتية. احتفظ بالنص الأصلي بجانبه، وراجع أي شيء يبدو غريبًا مع النص الأصلي أو مع أب الاعتراف.",
    needBook: "اختر السفر والإصحاح والآية.",
    needFather: "اختر أحد الآباء أولًا.",
    needText: "الصق نص التفسير أولًا.",
    noneFound: "لا توجد تفاسير لهذه الآية.",
    offline: "لا يمكن الوصول إلى التطبيق. تحقق من اتصالك بالإنترنت.",
    generic: "حدث خطأ. حاول مرة أخرى.",
    stopped: "تم الإيقاف.",
    badCode: "الرمز غير صحيح.",
    reenter: "أدخل رمز الدخول مرة أخرى.",
  },
};

export const EXAMPLE_EN = `**St. Augustine, Confessions I.1** *(example)*

## Plain version
Lord, you are great and you deserve all our praise. Your power is great, and your wisdom has no limit. Human beings want to praise you, even though we are only a tiny part of everything you made. We carry our mortality around with us, and it reminds us of our sin and that you oppose the proud. Even so, we still want to praise you. You stir us up to find joy in praising you, because you made us for yourself, and our hearts cannot rest until they rest in you.

## Words explained
- **Particle** — a very small part.
- **Mortality** — the fact that we will die.
- **Resistest the proud** — "you stand against proud people".
- **Repose** — rest, be at peace.

## Bible verses mentioned
- Psalm 145:3 — "Great is the Lord, and greatly to be praised"
- Psalm 147:5 — his understanding is without number
- James 4:6 / 1 Peter 5:5 — God resists the proud

## Main point
We are small, mortal and sinful, yet God made us for himself. That is why we long to praise him, and why nothing else can give our hearts real rest.`;

export const EXAMPLE_AR = `**القديس أغسطينوس، الاعترافات ١:١** *(مثال)*

## النص المبسّط
أيها الرب، أنت عظيم وتستحق كل التسبيح. قوتك عظيمة، وحكمتك لا حدّ لها. يريد الإنسان أن يسبّحك، مع أنه جزء صغير جدًا من كل ما خلقت. نحمل موتنا معنا، وهو يذكّرنا بخطيئتنا وبأنك تقاوم المتكبرين. ومع ذلك نريد أن نسبّحك. أنت توقظ فينا الفرح بتسبيحك، لأنك خلقتنا لنفسك، وقلبنا لا يستقر حتى يستقر فيك.

## شرح الكلمات
- **جزء ضئيل** — قسم صغير جدًا.
- **الموت (الفناء)** — حقيقة أننا سنموت.
- **تقاوم المتكبرين** — "تقف ضد المتكبرين" (اقتباس من الكتاب المقدس).
- **يستقر** — يرتاح ويطمئن.

## الآيات المذكورة
- مزمور ١٤٥:٣ — "عظيم هو الرب وحميد جدًا"
- مزمور ١٤٧:٥ — فهمه لا يُحصى
- يعقوب ٤:٦ / ١ بطرس ٥:٥ — الله يقاوم المتكبرين

## الفكرة الرئيسية
نحن صغار وفانون وخطأة، ومع ذلك خلقنا الله لنفسه. لذلك نشتاق إلى تسبيحه، ولذلك لا يستطيع شيء آخر أن يمنح قلوبنا راحة حقيقية.`;
