// The app's words in English and Russian. Keys are the English text, so a missing translation still reads well.
const RU: Record<string, string> = {
  'Home': 'Главная', 'Bible': 'Библия', 'Community': 'Сообщество', 'Profile': 'Профиль',
  'Good morning': 'Доброе утро', 'Good afternoon': 'Добрый день', 'Good evening': 'Добрый вечер',
  'Verse of the day': 'Стих дня', 'Your streak': 'Ваша серия', 'days': 'дн.', 'Level': 'Уровень',
  'Challenge of Krest': 'Челлендж Креста', 'Old Testament': 'Ветхий Завет', 'New Testament': 'Новый Завет',
  'Explain': 'Объяснить', 'Context': 'Контекст', 'Original words': 'Оригинал', 'Cross-references': 'Ссылки', 'Apply': 'Применить',
  'Ask anything about this chapter…': 'Спросите что угодно об этой главе…', 'Ask': 'Спросить', 'Thinking…': 'Думаю…',
  'This is a study aid, not a pastor. Check it with Scripture and your church.': 'Это помощник в изучении, а не пастор. Сверяйте с Писанием и своей церковью.',
  'Share what God is doing…': 'Поделитесь, что делает Бог…', 'Publish': 'Опубликовать', 'Post': 'Пост', 'Testimony': 'Свидетельство',
  'Prayer request': 'Молитвенная просьба', 'I prayed': 'Я помолился(-ась)', 'prayed': 'помолились', 'Everyone': 'Все', 'Friends': 'Друзья',
  'Sign in': 'Войти', 'Sign out': 'Выйти', 'Sign in with email': 'Войти по почте', 'Your email': 'Ваша почта',
  'Check your email for the sign-in link.': 'Проверьте почту: там ссылка для входа.', 'Preview mode: connect Supabase to save for real.': 'Демо-режим: подключите Supabase, чтобы всё сохранялось.',
  'Highlight': 'Выделить', 'Close': 'Закрыть', 'Try again': 'Попробовать снова', 'Nothing here yet. Be the first!': 'Здесь пока пусто. Будьте первым!',
  'Write the Cross by hand today and send a photo': 'Напишите Крест от руки сегодня и отправьте фото', 'Feed': 'Лента', 'Testimonies': 'Свидетельства', 'Prayer': 'Молитва',
  'Language': 'Язык', 'New post': 'Новый пост', 'Photo': 'Фото', 'Who will see it?': 'Кто увидит?', 'Chapter': 'Глава',
};

let lang: 'en' | 'ru' = /^ru|^uk|^be|^kk/.test(Intl.DateTimeFormat().resolvedOptions().locale) ? 'ru' : 'en';
export const getLang = () => lang;
export const setLang = (l: 'en' | 'ru') => { lang = l; };
export const t = (k: string) => (lang === 'ru' ? RU[k] ?? k : k);
