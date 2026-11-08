// The 66 books, the public-domain translations, and reading a chapter (kept on the phone after the first read).
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Book = { n: number; en: string; ru: string; chapters: number };
export type Verse = { v: number; text: string };

export const BOOKS: Book[] = [
  { n: 1, en: 'Genesis', ru: 'Бытие', chapters: 50 },
  { n: 2, en: 'Exodus', ru: 'Исход', chapters: 40 },
  { n: 3, en: 'Leviticus', ru: 'Левит', chapters: 27 },
  { n: 4, en: 'Numbers', ru: 'Числа', chapters: 36 },
  { n: 5, en: 'Deuteronomy', ru: 'Второзаконие', chapters: 34 },
  { n: 6, en: 'Joshua', ru: 'Иисус Навин', chapters: 24 },
  { n: 7, en: 'Judges', ru: 'Судьи', chapters: 21 },
  { n: 8, en: 'Ruth', ru: 'Руфь', chapters: 4 },
  { n: 9, en: '1 Samuel', ru: '1 Царств', chapters: 31 },
  { n: 10, en: '2 Samuel', ru: '2 Царств', chapters: 24 },
  { n: 11, en: '1 Kings', ru: '3 Царств', chapters: 22 },
  { n: 12, en: '2 Kings', ru: '4 Царств', chapters: 25 },
  { n: 13, en: '1 Chronicles', ru: '1 Паралипоменон', chapters: 29 },
  { n: 14, en: '2 Chronicles', ru: '2 Паралипоменон', chapters: 36 },
  { n: 15, en: 'Ezra', ru: 'Ездра', chapters: 10 },
  { n: 16, en: 'Nehemiah', ru: 'Неемия', chapters: 13 },
  { n: 17, en: 'Esther', ru: 'Есфирь', chapters: 10 },
  { n: 18, en: 'Job', ru: 'Иов', chapters: 42 },
  { n: 19, en: 'Psalms', ru: 'Псалтирь', chapters: 150 },
  { n: 20, en: 'Proverbs', ru: 'Притчи', chapters: 31 },
  { n: 21, en: 'Ecclesiastes', ru: 'Екклесиаст', chapters: 12 },
  { n: 22, en: 'Song of Solomon', ru: 'Песнь Песней', chapters: 8 },
  { n: 23, en: 'Isaiah', ru: 'Исаия', chapters: 66 },
  { n: 24, en: 'Jeremiah', ru: 'Иеремия', chapters: 52 },
  { n: 25, en: 'Lamentations', ru: 'Плач Иеремии', chapters: 5 },
  { n: 26, en: 'Ezekiel', ru: 'Иезекииль', chapters: 48 },
  { n: 27, en: 'Daniel', ru: 'Даниил', chapters: 12 },
  { n: 28, en: 'Hosea', ru: 'Осия', chapters: 14 },
  { n: 29, en: 'Joel', ru: 'Иоиль', chapters: 3 },
  { n: 30, en: 'Amos', ru: 'Амос', chapters: 9 },
  { n: 31, en: 'Obadiah', ru: 'Авдий', chapters: 1 },
  { n: 32, en: 'Jonah', ru: 'Иона', chapters: 4 },
  { n: 33, en: 'Micah', ru: 'Михей', chapters: 7 },
  { n: 34, en: 'Nahum', ru: 'Наум', chapters: 3 },
  { n: 35, en: 'Habakkuk', ru: 'Аввакум', chapters: 3 },
  { n: 36, en: 'Zephaniah', ru: 'Софония', chapters: 3 },
  { n: 37, en: 'Haggai', ru: 'Аггей', chapters: 2 },
  { n: 38, en: 'Zechariah', ru: 'Захария', chapters: 14 },
  { n: 39, en: 'Malachi', ru: 'Малахия', chapters: 4 },
  { n: 40, en: 'Matthew', ru: 'Матфея', chapters: 28 },
  { n: 41, en: 'Mark', ru: 'Марка', chapters: 16 },
  { n: 42, en: 'Luke', ru: 'Луки', chapters: 24 },
  { n: 43, en: 'John', ru: 'Иоанна', chapters: 21 },
  { n: 44, en: 'Acts', ru: 'Деяния', chapters: 28 },
  { n: 45, en: 'Romans', ru: 'Римлянам', chapters: 16 },
  { n: 46, en: '1 Corinthians', ru: '1 Коринфянам', chapters: 16 },
  { n: 47, en: '2 Corinthians', ru: '2 Коринфянам', chapters: 13 },
  { n: 48, en: 'Galatians', ru: 'Галатам', chapters: 6 },
  { n: 49, en: 'Ephesians', ru: 'Ефесянам', chapters: 6 },
  { n: 50, en: 'Philippians', ru: 'Филиппийцам', chapters: 4 },
  { n: 51, en: 'Colossians', ru: 'Колоссянам', chapters: 4 },
  { n: 52, en: '1 Thessalonians', ru: '1 Фессалоникийцам', chapters: 5 },
  { n: 53, en: '2 Thessalonians', ru: '2 Фессалоникийцам', chapters: 3 },
  { n: 54, en: '1 Timothy', ru: '1 Тимофею', chapters: 6 },
  { n: 55, en: '2 Timothy', ru: '2 Тимофею', chapters: 4 },
  { n: 56, en: 'Titus', ru: 'Титу', chapters: 3 },
  { n: 57, en: 'Philemon', ru: 'Филимону', chapters: 1 },
  { n: 58, en: 'Hebrews', ru: 'Евреям', chapters: 13 },
  { n: 59, en: 'James', ru: 'Иакова', chapters: 5 },
  { n: 60, en: '1 Peter', ru: '1 Петра', chapters: 5 },
  { n: 61, en: '2 Peter', ru: '2 Петра', chapters: 3 },
  { n: 62, en: '1 John', ru: '1 Иоанна', chapters: 5 },
  { n: 63, en: '2 John', ru: '2 Иоанна', chapters: 1 },
  { n: 64, en: '3 John', ru: '3 Иоанна', chapters: 1 },
  { n: 65, en: 'Jude', ru: 'Иуды', chapters: 1 },
  { n: 66, en: 'Revelation', ru: 'Откровение', chapters: 22 },
];

// Public-domain texts first (free to use); licensed translations come through API.Bible later.
export const TRANSLATIONS = {
  en: { code: 'WEB', name: 'World English Bible' },
  ru: { code: 'SYNOD', name: 'Синодальный перевод' },
} as const;

const clean = (s: string) => s.replace(/<S>.*?<\/S>/g, '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

export async function readChapter(lang: 'en' | 'ru', book: number, chapter: number): Promise<Verse[]> {
  const code = TRANSLATIONS[lang].code;
  const key = `bible:${code}:${book}:${chapter}`;
  try { const hit = await AsyncStorage.getItem(key); if (hit) return JSON.parse(hit) as Verse[]; } catch { /* read it fresh */ }
  const res = await fetch(`https://bolls.life/get-text/${code}/${book}/${chapter}/`);
  if (!res.ok) throw new Error('The chapter could not be loaded.');
  const rows = (await res.json()) as { verse: number; text: string }[];
  const verses = rows.map(r => ({ v: r.verse, text: clean(r.text) })).filter(x => x.text);
  try { await AsyncStorage.setItem(key, JSON.stringify(verses)); } catch { /* storage full: fine */ }
  return verses;
}

export const bookName = (b: Book, lang: 'en' | 'ru') => (lang === 'ru' ? b.ru : b.en);
export const refLabel = (b: Book, lang: 'en' | 'ru', ch: number, v1: number, v2 = v1) => `${bookName(b, lang)} ${ch}:${v1}${v2 !== v1 ? '–' + v2 : ''}`;
