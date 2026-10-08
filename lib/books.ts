/**
 * The 66 books, with the code Catena uses in its URLs. Several codes are listed
 * where the scheme is uncertain; the server tries each until a page responds.
 * `en` and `ar` are the display names used by the book dropdown.
 */
export type Book = { en: string; ar: string; codes: string[]; aliases: string[] };

export const BOOKS: Book[] = [
  { en: "Genesis", ar: "التكوين", codes: ["gn", "gen"], aliases: ["gen", "gn", "تكوين"] },
  { en: "Exodus", ar: "الخروج", codes: ["ex", "exod"], aliases: ["exod", "ex", "خروج"] },
  { en: "Leviticus", ar: "اللاويين", codes: ["lv", "lev"], aliases: ["lev", "lv", "لاويين"] },
  { en: "Numbers", ar: "العدد", codes: ["nm", "num"], aliases: ["num", "nm", "عدد"] },
  { en: "Deuteronomy", ar: "التثنية", codes: ["dt", "deut"], aliases: ["deut", "dt", "تثنية"] },
  { en: "Joshua", ar: "يشوع", codes: ["jos", "josh"], aliases: ["josh", "jos"] },
  { en: "Judges", ar: "القضاة", codes: ["jgs", "jdg", "judg"], aliases: ["judg", "jdg", "قضاة"] },
  { en: "Ruth", ar: "راعوث", codes: ["ru", "rt", "ruth"], aliases: ["rt"] },
  { en: "1 Samuel", ar: "1 صموئيل", codes: ["1sm", "1sam"], aliases: ["1 sam", "1sm", "١ صموئيل"] },
  { en: "2 Samuel", ar: "2 صموئيل", codes: ["2sm", "2sam"], aliases: ["2 sam", "2sm", "٢ صموئيل"] },
  { en: "1 Kings", ar: "1 ملوك", codes: ["1kgs", "1ki"], aliases: ["1 kgs", "1 ki", "١ ملوك"] },
  { en: "2 Kings", ar: "2 ملوك", codes: ["2kgs", "2ki"], aliases: ["2 kgs", "2 ki", "٢ ملوك"] },
  { en: "1 Chronicles", ar: "1 أخبار", codes: ["1chr", "1ch"], aliases: ["1 chron", "1 chr", "1 اخبار"] },
  { en: "2 Chronicles", ar: "2 أخبار", codes: ["2chr", "2ch"], aliases: ["2 chron", "2 chr", "2 اخبار"] },
  { en: "Ezra", ar: "عزرا", codes: ["ezr", "ezra"], aliases: ["ezr"] },
  { en: "Nehemiah", ar: "نحميا", codes: ["neh"], aliases: ["neh"] },
  { en: "Esther", ar: "أستير", codes: ["est", "esth"], aliases: ["esth", "est", "استير"] },
  { en: "Job", ar: "أيوب", codes: ["jb", "job"], aliases: ["jb", "ايوب"] },
  { en: "Psalms", ar: "المزامير", codes: ["ps", "pss"], aliases: ["psalm", "ps", "pss", "مزمور", "مزامير"] },
  { en: "Proverbs", ar: "الأمثال", codes: ["prv", "prov"], aliases: ["prov", "prv", "امثال"] },
  { en: "Ecclesiastes", ar: "الجامعة", codes: ["eccl", "ec"], aliases: ["eccl", "eccles", "ec", "جامعة"] },
  { en: "Song of Songs", ar: "نشيد الأنشاد", codes: ["sg", "song"], aliases: ["song of solomon", "song", "sg", "نشيد"] },
  { en: "Isaiah", ar: "إشعياء", codes: ["is", "isa"], aliases: ["isa", "is", "اشعياء"] },
  { en: "Jeremiah", ar: "إرميا", codes: ["jer"], aliases: ["jer", "ارميا"] },
  { en: "Lamentations", ar: "مراثي إرميا", codes: ["lam"], aliases: ["lam", "مراثي"] },
  { en: "Ezekiel", ar: "حزقيال", codes: ["ez", "ezek"], aliases: ["ezek", "ez"] },
  { en: "Daniel", ar: "دانيال", codes: ["dn", "dan"], aliases: ["dan", "dn"] },
  { en: "Hosea", ar: "هوشع", codes: ["hos"], aliases: ["hos"] },
  { en: "Joel", ar: "يوئيل", codes: ["jl", "joel"], aliases: ["jl"] },
  { en: "Amos", ar: "عاموس", codes: ["am", "amos"], aliases: ["am"] },
  { en: "Obadiah", ar: "عوبديا", codes: ["ob", "obad"], aliases: ["obad", "ob"] },
  { en: "Jonah", ar: "يونان", codes: ["jon", "jonah"], aliases: ["jon", "يونس"] },
  { en: "Micah", ar: "ميخا", codes: ["mi", "mic"], aliases: ["mic", "mi"] },
  { en: "Nahum", ar: "ناحوم", codes: ["na", "nah"], aliases: ["nah", "na"] },
  { en: "Habakkuk", ar: "حبقوق", codes: ["hb", "hab"], aliases: ["hab", "hb"] },
  { en: "Zephaniah", ar: "صفنيا", codes: ["zep", "zeph"], aliases: ["zeph", "zep"] },
  { en: "Haggai", ar: "حجي", codes: ["hg", "hag"], aliases: ["hag", "hg"] },
  { en: "Zechariah", ar: "زكريا", codes: ["zec", "zech"], aliases: ["zech", "zec"] },
  { en: "Malachi", ar: "ملاخي", codes: ["mal"], aliases: ["mal"] },
  { en: "Matthew", ar: "متى", codes: ["mt", "matt"], aliases: ["matt", "mt", "انجيل متى"] },
  { en: "Mark", ar: "مرقس", codes: ["mk", "mark"], aliases: ["mk"] },
  { en: "Luke", ar: "لوقا", codes: ["lk", "luke"], aliases: ["lk"] },
  { en: "John", ar: "يوحنا", codes: ["jn", "john"], aliases: ["jn"] },
  { en: "Acts", ar: "أعمال الرسل", codes: ["acts", "ac"], aliases: ["ac", "اعمال", "اعمال الرسل"] },
  { en: "Romans", ar: "رومية", codes: ["rom", "rm"], aliases: ["rom", "rm"] },
  { en: "1 Corinthians", ar: "1 كورنثوس", codes: ["1cor", "1co"], aliases: ["1 cor", "1co", "١ كورنثوس"] },
  { en: "2 Corinthians", ar: "2 كورنثوس", codes: ["2cor", "2co"], aliases: ["2 cor", "2co", "٢ كورنثوس"] },
  { en: "Galatians", ar: "غلاطية", codes: ["gal"], aliases: ["gal"] },
  { en: "Ephesians", ar: "أفسس", codes: ["eph"], aliases: ["eph", "افسس"] },
  { en: "Philippians", ar: "فيلبي", codes: ["phil", "php"], aliases: ["phil", "php"] },
  { en: "Colossians", ar: "كولوسي", codes: ["col"], aliases: ["col"] },
  { en: "1 Thessalonians", ar: "1 تسالونيكي", codes: ["1thes", "1thess", "1th"], aliases: ["1 thess", "1th", "١ تسالونيكي"] },
  { en: "2 Thessalonians", ar: "2 تسالونيكي", codes: ["2thes", "2thess", "2th"], aliases: ["2 thess", "2th", "٢ تسالونيكي"] },
  { en: "1 Timothy", ar: "1 تيموثاوس", codes: ["1tm", "1tim"], aliases: ["1 tim", "1tm", "١ تيموثاوس"] },
  { en: "2 Timothy", ar: "2 تيموثاوس", codes: ["2tm", "2tim"], aliases: ["2 tim", "2tm", "٢ تيموثاوس"] },
  { en: "Titus", ar: "تيطس", codes: ["ti", "tit"], aliases: ["tit", "ti"] },
  { en: "Philemon", ar: "فليمون", codes: ["phlm", "philem"], aliases: ["philem", "phlm"] },
  { en: "Hebrews", ar: "العبرانيين", codes: ["heb"], aliases: ["heb", "عبرانيين"] },
  { en: "James", ar: "يعقوب", codes: ["jas", "james"], aliases: ["jas"] },
  { en: "1 Peter", ar: "1 بطرس", codes: ["1pt", "1pet"], aliases: ["1 pet", "1pt", "١ بطرس"] },
  { en: "2 Peter", ar: "2 بطرس", codes: ["2pt", "2pet"], aliases: ["2 pet", "2pt", "٢ بطرس"] },
  { en: "1 John", ar: "1 يوحنا", codes: ["1jn", "1john"], aliases: ["1 jn", "1jn", "١ يوحنا"] },
  { en: "2 John", ar: "2 يوحنا", codes: ["2jn", "2john"], aliases: ["2 jn", "2jn", "٢ يوحنا"] },
  { en: "3 John", ar: "3 يوحنا", codes: ["3jn", "3john"], aliases: ["3 jn", "3jn", "٣ يوحنا"] },
  { en: "Jude", ar: "يهوذا", codes: ["jude", "jd"], aliases: ["jd"] },
  { en: "Revelation", ar: "الرؤيا", codes: ["rv", "rev"], aliases: ["rev", "apocalypse", "rv", "رؤيا", "رويا"] },
];

/** For the dropdown: id is stable and safe to send over the wire. */
export const BOOK_OPTIONS = BOOKS.map((b, i) => ({ id: String(i), en: b.en, ar: b.ar }));

export function bookById(id: string): Book | null {
  const i = Number(id);
  return Number.isInteger(i) && i >= 0 && i < BOOKS.length ? BOOKS[i] : null;
}

const normalize = (t: string) =>
  t
    .toLowerCase()
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/^(ال)(?=\S{3})/, "")
    .replace(/\s+/g, " ")
    .trim();

function findBook(name: string): Book | null {
  const n = normalize(name);
  for (const b of BOOKS) {
    const all = [b.en, b.ar, ...b.aliases];
    if (all.some((a) => normalize(a) === n)) return b;
  }
  return null;
}

/** "1 Cor 13:4", "يوحنا ٣:١٦" -> the book's codes plus chapter and verse. */
export function parseReference(raw: string): { codes: string[]; chapter: number; verse: number } | null {
  const s = normalize(raw);
  // A roman-numeral prefix must be followed by a space, or "Isaiah" is read as
  // "I" + "saiah" and never matches a book.
  const m = s.match(
    /^((?:[1-3]\s*)|(?:i{1,3}\s+))?([a-z؀-ۿ][a-z؀-ۿ\s.]*?)\.?\s*(\d{1,3})\s*[:.\s]\s*(\d{1,3})/,
  );
  if (!m) return null;
  const roman: Record<string, string> = { i: "1", ii: "2", iii: "3" };
  const prefixRaw = (m[1] ?? "").trim();
  const prefix = roman[prefixRaw] ?? prefixRaw;
  const name = `${prefix ? prefix + " " : ""}${m[2].trim()}`;
  const chapter = Number(m[3]);
  const verse = Number(m[4]);
  const book = findBook(name);
  if (!book || !chapter || !verse) return null;
  return { codes: book.codes, chapter, verse };
}
