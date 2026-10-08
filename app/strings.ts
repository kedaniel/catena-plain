/** Interface copy for the two versions. The Arabic version renders right-to-left. */
export type Profile = "full" | "arabic";

export const UI = {
  full: {
    dir: "ltr" as const,
    titleA: "Catena",
    titleB: "Simplifier",
    tagline:
      "Choose a verse, pick a Church Father, and read his commentary in simpler English or in Arabic.",
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
    moreHint: "If one is missing, open it in Catena and paste its link above.",
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
      "This text is produced by AI and nobody has checked it. It can soften careful theological wording or misread an old phrase. Treat it as a reading aid, never as the Father's own words: keep the original beside it, and check anything that matters against the source or ask a priest.",
    made: "made with love for Theobiblia 26 batch cohort",
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
    titleA: "Catena",
    titleB: "Simplifier",
    tagline: "اختر الآية، ثم اختر أحد الآباء، لتقرأ تفسيره بلغة عربية بسيطة.",
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
    moreHint: "إذا كان أحد التفاسير غير ظاهر، افتحه في Catena والصق رابطه أعلاه.",
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
    note: "هذا النص من إنتاج الذكاء الاصطناعي ولم يراجعه أحد. قد يُخفّف دقة الصياغة اللاهوتية أو يُخطئ في فهم عبارة قديمة. اعتبره عونًا على القراءة لا كلام الأب نفسه: احتفظ بالنص الأصلي بجانبه، وراجع ما يهمّك مع النص الأصلي أو مع أب الاعتراف.",
    made: "صُنع بمحبة لأجل دفعة ثيوبيبليا ٢٦",
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

## Full text in plain language
Lord, you are great, and you deserve all our praise. Your power is great. Your wisdom has no limit or number.

And a human being wants to praise you — a human being, who is only a tiny part of everything you made. A human being who carries his own mortality about with him, who carries the evidence of his sin with him, and who carries the evidence that you stand against the proud. And still, even so, this human being wants to praise you — he who is only a tiny part of what you made.

You are the one who stirs us up, so that praising you becomes a delight to us. You did this because you made us for yourself. And so our heart has no rest in it, and will not rest, until it comes to rest in you.


## Summary
Augustine opens his Confessions by praising God rather than by explaining himself. He sets God's greatness, power and limitless wisdom against what a human being is: a small part of creation, carrying death and sin about with him. The main point is that this small, mortal creature still longs to praise God, and that the longing is God's own doing: he made us for himself, so our hearts stay restless until they rest in him.`;

export const EXAMPLE_AR = `**القديس أغسطينوس، الاعترافات ١:١** *(مثال)*

## النص الكامل بلغة بسيطة
أيها الرب، أنت عظيم، وتستحق كل التسبيح. قوتك عظيمة، وحكمتك لا حدّ لها ولا عدد.

والإنسان يريد أن يسبّحك — الإنسان الذي هو جزء صغير جدًا من كل ما خلقت. الإنسان الذي يحمل موته معه، ويحمل معه الدليل على خطيئته، ويحمل الدليل على أنك تقاوم المتكبرين. ومع ذلك، هذا الإنسان يريد أن يسبّحك، وهو ليس إلا جزءًا ضئيلًا من خلقك.

أنت الذي توقظنا، حتى يصير تسبيحك فرحًا لنا. وفعلت ذلك لأنك خلقتنا لنفسك. ولذلك لا يجد قلبنا راحة، ولن يجدها، حتى يستقر فيك.


## الملخص
يبدأ أغسطينوس اعترافاته بالتسبيح لا بالحديث عن نفسه. يضع عظمة الله وقوته وحكمته غير المحدودة في مقابل حقيقة الإنسان: جزء صغير من الخلق، يحمل موته وخطيئته معه. والفكرة الرئيسية أن هذا المخلوق الصغير الفاني ما زال يشتاق إلى تسبيح الله، وأن هذا الاشتياق هو من عمل الله نفسه: فقد خلقنا لنفسه، ولذلك يبقى قلبنا بلا راحة حتى يستقر فيه.`;
