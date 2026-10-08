/**
 * Standard Arabic names for the Fathers who appear most often in Catena.
 *
 * A small model asked to render "Ambrose of Milan" in Arabic invents a
 * transliteration, and the result can be unreadable — one run produced
 * "القديسبر وساور سين" for Ambrose. These are the forms an Arabic-speaking
 * church actually uses, so the model is given the name rather than guessing.
 *
 * Keys are matched loosely against the name Catena shows: lowercased, with
 * "st."/"saint" and any trailing dates removed.
 */
const ARABIC_NAMES: { match: string[]; ar: string }[] = [
  { match: ["ambrose"], ar: "القديس أمبروسيوس أسقف ميلان" },
  { match: ["augustine"], ar: "القديس أغسطينوس أسقف هيبو" },
  { match: ["john chrysostom", "chrysostom"], ar: "القديس يوحنا ذهبي الفم" },
  { match: ["athanasius"], ar: "القديس أثناسيوس الرسولي" },
  { match: ["cyril of alexandria"], ar: "القديس كيرلس الإسكندري" },
  { match: ["cyril of jerusalem"], ar: "القديس كيرلس الأورشليمي" },
  { match: ["basil"], ar: "القديس باسيليوس الكبير" },
  { match: ["gregory of nazianzus", "gregory nazianzen"], ar: "القديس غريغوريوس النزينزي" },
  { match: ["gregory of nyssa"], ar: "القديس غريغوريوس النيصي" },
  { match: ["gregory the great", "gregory of rome"], ar: "القديس غريغوريوس الكبير" },
  { match: ["jerome"], ar: "القديس إيرونيموس" },
  { match: ["origen"], ar: "العلامة أوريجانوس" },
  { match: ["tertullian"], ar: "العلامة ترتليان" },
  { match: ["irenaeus"], ar: "القديس إيريناوس أسقف ليون" },
  { match: ["justin martyr", "justin"], ar: "القديس يوستينوس الشهيد" },
  { match: ["clement of alexandria"], ar: "القديس إكليمنضس السكندري" },
  { match: ["clement of rome"], ar: "القديس إكليمنضس الروماني" },
  { match: ["leo"], ar: "القديس لاون الكبير أسقف رومية" },
  { match: ["ephrem", "ephraim"], ar: "القديس أفرآم السرياني" },
  { match: ["hilary"], ar: "القديس هيلاري أسقف بواتييه" },
  { match: ["theodoret"], ar: "ثيئودوريتس أسقف قورش" },
  { match: ["bede"], ar: "القديس بيدا المبجل" },
  { match: ["caesarius"], ar: "القديس كيصاريوس أسقف آرل" },
  { match: ["maximus of turin"], ar: "القديس مكسيموس أسقف تورين" },
  { match: ["peter chrysologus"], ar: "القديس بطرس خريسولوغوس" },
  { match: ["john cassian", "cassian"], ar: "القديس يوحنا كاسيان" },
  { match: ["isidore of seville"], ar: "القديس إيسيذورس الإشبيلي" },
  { match: ["didymus"], ar: "ديديموس الضرير" },
  { match: ["severus of antioch"], ar: "القديس ساويرس الأنطاكي" },
  { match: ["macarius"], ar: "القديس مقاريوس" },
  { match: ["anthony the great", "antony the great"], ar: "القديس أنطونيوس الكبير" },
  { match: ["shenoute", "shenouda"], ar: "الأنبا شنودة رئيس المتوحدين" },
  { match: ["pachomius"], ar: "الأنبا باخوميوس" },
  { match: ["cyprian"], ar: "القديس كبريانوس أسقف قرطاجنة" },
  { match: ["ignatius"], ar: "القديس إغناطيوس الأنطاكي" },
  { match: ["polycarp"], ar: "القديس بوليكاربوس" },
  { match: ["eusebius"], ar: "يوسابيوس القيصري" },
  { match: ["lactantius"], ar: "لاكتانتيوس" },
  { match: ["chromatius"], ar: "خروماتيوس أسقف أكويليا" },
  { match: ["fulgentius"], ar: "القديس فولجنتيوس أسقف روسبي" },
  { match: ["prosper"], ar: "بروسبر الأكويتاني" },
  { match: ["salvian"], ar: "سلفيان الكاهن" },
  { match: ["alexander of alexandria"], ar: "القديس ألكسندروس الإسكندري" },
  { match: ["epiphanius"], ar: "القديس إبيفانيوس أسقف قبرص" },
  { match: ["john of damascus"], ar: "القديس يوحنا الدمشقي" },
  { match: ["symeon", "simeon the new theologian"], ar: "القديس سمعان اللاهوتي الحديث" },
  { match: ["ambrosiaster"], ar: "أمبروسياستر" },
  { match: ["oecumenius"], ar: "أوكومينيوس" },
  { match: ["andrew of caesarea"], ar: "أندراوس أسقف قيصرية" },
  { match: ["victorinus"], ar: "فيكتورينوس" },
  { match: ["novatian"], ar: "نوفاتيان" },
  { match: ["methodius"], ar: "القديس ميثوديوس" },
  { match: ["aphrahat"], ar: "أفراهاط الحكيم الفارسي" },
  { match: ["jacob of sarug", "jacob of serugh"], ar: "مار يعقوب السروجي" },
  { match: ["isaac of nineveh", "isaac the syrian"], ar: "القديس إسحق السرياني" },
  { match: ["evagrius"], ar: "أوغريس البنطي" },
  { match: ["hippolytus"], ar: "القديس هيبوليتس الروماني" },
  { match: ["pseudo-dionysius", "dionysius the areopagite"], ar: "ديونيسيوس الأريوباغي" },
  { match: ["dionysius of alexandria"], ar: "القديس ديونيسيوس السكندري" },
  { match: ["paulinus"], ar: "القديس بولينوس النولاني" },
  { match: ["valerian"], ar: "فاليريان أسقف تشيميه" },
  { match: ["quodvultdeus"], ar: "قودفولتدايوس" },
  { match: ["braulio"], ar: "براوليو أسقف سرقسطة" },
];

const normalize = (name: string) =>
  name
    .toLowerCase()
    .replace(/\bst\.?\b|\bsaint\b|\bthe blessed\b|\bblessed\b|\bpope\b|\babba\b/g, "")
    .replace(/\(.*?\)/g, "")
    .replace(/\bad\s*\d+.*$/i, "")
    .replace(/[^a-z\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** The standard Arabic name for a Father, or null when he isn't in the list. */
export function arabicFatherName(name: string): string | null {
  const n = normalize(name);
  if (!n) return null;
  // Longest match first, so "cyril of alexandria" beats a bare "cyril".
  const ranked = [...ARABIC_NAMES].sort(
    (a, b) => Math.max(...b.match.map((m) => m.length)) - Math.max(...a.match.map((m) => m.length)),
  );
  for (const entry of ranked) {
    if (entry.match.some((m) => n.includes(m))) return entry.ar;
  }
  return null;
}
