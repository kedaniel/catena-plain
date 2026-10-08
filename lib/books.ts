/**
 * Maps a typed reference ("John 3:16", "1 Cor 13:4") to the book code Catena
 * uses in its URLs. Several candidates are listed where the scheme is uncertain;
 * the server tries each until a verse page responds.
 */
const BOOKS: { names: string[]; codes: string[] }[] = [
  { names: ["genesis", "gen", "gn", "تكوين", "التكوين"], codes: ["gn", "gen"] },
  { names: ["exodus", "exod", "ex", "خروج", "الخروج"], codes: ["ex", "exod"] },
  { names: ["leviticus", "lev", "lv", "لاويين", "اللاويين"], codes: ["lv", "lev"] },
  { names: ["numbers", "num", "nm", "عدد", "العدد"], codes: ["nm", "num"] },
  { names: ["deuteronomy", "deut", "dt", "تثنية", "التثنية"], codes: ["dt", "deut"] },
  { names: ["joshua", "josh", "jos", "يشوع"], codes: ["jos", "josh"] },
  { names: ["judges", "judg", "jdg", "قضاة", "القضاة"], codes: ["jdg", "judg"] },
  { names: ["ruth", "rt", "راعوث"], codes: ["rt", "ruth"] },
  { names: ["1 samuel", "1 sam", "1sm", "1 صموئيل", "١ صموئيل"], codes: ["1sm", "1sam"] },
  { names: ["2 samuel", "2 sam", "2sm", "2 صموئيل", "٢ صموئيل"], codes: ["2sm", "2sam"] },
  { names: ["1 kings", "1 kgs", "1 ملوك", "١ ملوك"], codes: ["1kgs", "1ki"] },
  { names: ["2 kings", "2 kgs", "2 ملوك", "٢ ملوك"], codes: ["2kgs", "2ki"] },
  { names: ["1 chronicles", "1 chron", "1 chr", "1 اخبار", "1 أخبار"], codes: ["1chr", "1ch"] },
  { names: ["2 chronicles", "2 chron", "2 chr", "2 اخبار", "2 أخبار"], codes: ["2chr", "2ch"] },
  { names: ["ezra", "ezr", "عزرا"], codes: ["ezr", "ezra"] },
  { names: ["nehemiah", "neh", "نحميا"], codes: ["neh"] },
  { names: ["esther", "esth", "استير", "أستير"], codes: ["est", "esth"] },
  { names: ["job", "jb", "ايوب", "أيوب"], codes: ["jb", "job"] },
  { names: ["psalm", "psalms", "ps", "pss", "مزمور", "مزامير", "المزامير"], codes: ["ps"] },
  { names: ["proverbs", "prov", "prv", "امثال", "أمثال", "الامثال"], codes: ["prv", "prov"] },
  { names: ["ecclesiastes", "eccl", "eccles", "جامعة", "الجامعة"], codes: ["ec", "eccl"] },
  { names: ["song of songs", "song of solomon", "song", "sg", "نشيد الانشاد", "نشيد"], codes: ["sg", "song"] },
  { names: ["isaiah", "isa", "is", "اشعياء", "إشعياء"], codes: ["is", "isa"] },
  { names: ["jeremiah", "jer", "ارميا", "إرميا"], codes: ["jer"] },
  { names: ["lamentations", "lam", "مراثي"], codes: ["lam"] },
  { names: ["ezekiel", "ezek", "ez", "حزقيال"], codes: ["ez", "ezek"] },
  { names: ["daniel", "dan", "dn", "دانيال"], codes: ["dn", "dan"] },
  { names: ["hosea", "hos", "هوشع"], codes: ["hos"] },
  { names: ["joel", "jl", "يوئيل"], codes: ["jl", "joel"] },
  { names: ["amos", "am", "عاموس"], codes: ["am", "amos"] },
  { names: ["obadiah", "obad", "عوبديا"], codes: ["ob", "obad"] },
  { names: ["jonah", "jon", "يونان"], codes: ["jon", "jonah"] },
  { names: ["micah", "mic", "ميخا"], codes: ["mi", "mic"] },
  { names: ["nahum", "nah", "ناحوم"], codes: ["na", "nah"] },
  { names: ["habakkuk", "hab", "حبقوق"], codes: ["hb", "hab"] },
  { names: ["zephaniah", "zeph", "صفنيا"], codes: ["zep", "zeph"] },
  { names: ["haggai", "hag", "حجي"], codes: ["hg", "hag"] },
  { names: ["zechariah", "zech", "زكريا"], codes: ["zec", "zech"] },
  { names: ["malachi", "mal", "ملاخي"], codes: ["mal"] },
  { names: ["matthew", "matt", "mt", "متى", "انجيل متى"], codes: ["mt", "matt"] },
  { names: ["mark", "mk", "مرقس"], codes: ["mk", "mark"] },
  { names: ["luke", "lk", "لوقا"], codes: ["lk", "luke"] },
  { names: ["john", "jn", "يوحنا"], codes: ["jn", "john"] },
  { names: ["acts", "ac", "اعمال", "أعمال", "اعمال الرسل"], codes: ["ac", "acts"] },
  { names: ["romans", "rom", "rm", "رومية", "الرومية"], codes: ["rom", "rm"] },
  { names: ["1 corinthians", "1 cor", "1 كورنثوس", "١ كورنثوس"], codes: ["1co", "1cor"] },
  { names: ["2 corinthians", "2 cor", "2 كورنثوس", "٢ كورنثوس"], codes: ["2co", "2cor"] },
  { names: ["galatians", "gal", "غلاطية"], codes: ["gal"] },
  { names: ["ephesians", "eph", "افسس", "أفسس"], codes: ["eph"] },
  { names: ["philippians", "phil", "php", "فيلبي"], codes: ["phil", "php"] },
  { names: ["colossians", "col", "كولوسي"], codes: ["col"] },
  { names: ["1 thessalonians", "1 thess", "1 تسالونيكي"], codes: ["1thes", "1th"] },
  { names: ["2 thessalonians", "2 thess", "2 تسالونيكي"], codes: ["2thes", "2th"] },
  { names: ["1 timothy", "1 tim", "1 تيموثاوس"], codes: ["1tm", "1tim"] },
  { names: ["2 timothy", "2 tim", "2 تيموثاوس"], codes: ["2tm", "2tim"] },
  { names: ["titus", "tit", "تيطس"], codes: ["ti", "tit"] },
  { names: ["philemon", "philem", "phlm", "فليمون"], codes: ["phlm", "philem"] },
  { names: ["hebrews", "heb", "عبرانيين", "العبرانيين"], codes: ["heb"] },
  { names: ["james", "jas", "يعقوب"], codes: ["jas", "james"] },
  { names: ["1 peter", "1 pet", "1 بطرس", "١ بطرس"], codes: ["1pt", "1pet"] },
  { names: ["2 peter", "2 pet", "2 بطرس", "٢ بطرس"], codes: ["2pt", "2pet"] },
  { names: ["1 john", "1 jn", "1 يوحنا", "١ يوحنا"], codes: ["1jn", "1john"] },
  { names: ["2 john", "2 jn", "2 يوحنا", "٢ يوحنا"], codes: ["2jn", "2john"] },
  { names: ["3 john", "3 jn", "3 يوحنا", "٣ يوحنا"], codes: ["3jn", "3john"] },
  { names: ["jude", "jd", "يهوذا"], codes: ["jude", "jd"] },
  { names: ["revelation", "rev", "apocalypse", "رؤيا", "الرؤيا", "رويا"], codes: ["rv", "rev"] },
];

/** "1 Cor 13:4" -> {codes: ["1co","1cor"], chapter: 13, verse: 4} */
export function parseReference(raw: string): { codes: string[]; chapter: number; verse: number } | null {
  const s = raw
    .toLowerCase()
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/\s+/g, " ")
    .trim();
  // Optional leading number (1 John), book name, chapter, separator, verse.
  const m = s.match(
    /^((?:[1-3]|i{1,3})\s*)?([a-z\u0600-\u06FF][a-z\u0600-\u06FF\s.]*?)\.?\s*(\d{1,3})\s*[:.\s]\s*(\d{1,3})/,
  );
  if (!m) return null;
  const roman: Record<string, string> = { i: "1", ii: "2", iii: "3" };
  const prefixRaw = (m[1] ?? "").trim();
  const prefix = roman[prefixRaw] ?? prefixRaw;
  const name = `${prefix ? prefix + " " : ""}${m[2].trim()}`.replace(/\s+/g, " ");
  const chapter = Number(m[3]);
  const verse = Number(m[4]);
  const bare = name.replace(/[أإآ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه");
  const norm = (t: string) => t.replace(/[أإآ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه");
  const hit =
    BOOKS.find((b) => b.names.includes(name)) ?? BOOKS.find((b) => b.names.some((n) => norm(n) === bare));
  if (!hit || !chapter || !verse) return null;
  return { codes: hit.codes, chapter, verse };
}
