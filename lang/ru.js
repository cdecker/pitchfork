/* these files need to be written in utf-8 */
/* Translated by Kirill Strizhak (Contact: k.strizhak84@gmail.com) */

var LANG = new Object();
// Messages
LANG.VOLUME		="Громкость";
LANG.BITRATE		="Битрейт: ";
LANG.POSITION		="Позиция: ";
LANG.CROP		="Обрезать";
LANG.CROP_SELECTION	="Обрезать до выбранного";
LANG.CLEAR_PLAYLIST	="Очистить плейлист";

LANG.PLAY		="Проигрывать";
LANG.STOP		="Остановить";


LANG.WAIT_LOADING	="Загружается.."; 
LANG.WAIT_UPDATING_DB	="База обновляется.."
LANG.WAIT_UPDATING_PL	="Плейлист обновляется, пожалуйста подождите..";
LANG.WAIT_REMOVING	="Удаляется..";
LANG.WAIT_ADDING	="Добавляется..";
LANG.WAIT_ADDING_PL	="Добавляется плейлист..";
LANG.WAIT_SEARCHING	= "Поиск..";

LANG.UPDATE_DB		="Обновление базы";
LANG.ARTIST 		="Артист";
LANG.TITLE 		="Название";
LANG.ALBUM 		="Альбом";
LANG.GENRE		="Жанр";
LANG.FILENAME		="Имя файла";
LANG.FILESYSTEM		="Файловая система";
LANG.LYRICS		="Текст песни";
LANG.SEARCH		="Поиск";
LANG.ADD		="Добавить";
LANG.EDIT		="Редактировать";
LANG.DELETE		="Удалить";
LANG.CONFIRM_REMOVE	="Точно удалить";
LANG.YES		="Да";
LANG.NO			="Нет";
LANG.BY_URL		="По URL";
LANG.FROM_FILE		="Из файла";
LANG.TEXT		="Текст";
LANG.OUTPUTS		="Выходы:";
LANG.CLOSE		="Закрыть";
LANG.SAVE		="Сохранить";
LANG.REFETCH		="Получить снова";
LANG.HIDE		="Спрятать";
LANG.AUTOPLAY		="Автозапуск";
LANG.NO_AUTOPLAY	="Без автозапуска";
LANG.STREAMING		="Стриминг";

LANG.ANYTAG		="Любой тег";
LANG.COMPOSER		="Композитор";
LANG.PERFORMER		="Исполнитель";
LANG.DATE		="Дата";


LANG.PL_SAVE_AS 	="Сохранить плейлист как: ";
LANG.PL_SAVING		="Плейлист сохраняется";

LANG.REPEAT		="Повторять";
LANG.RANDOM		="Случайный";
LANG.XFADE		="Переход: ";

LANG.QUICK_ADD		="Быстрое добавление";

LANG.ALBUM_REVIEW	="Обзор альбома";
LANG.ALBUM_DESC		="Описание альбома";
// e.g. album review for some album by some artist, the spaces are important
LANG.ALBUM_AA_NAME	=" для %s от %s"; 
LANG.ALBUM_AMAZON	="Альбом на amazon.com (в новом окне)";

LANG.JUMP_CURRENT	= "Перейти к играющей песне [Пробел]";
LANG.PAGINATION_FOLLOW	= "Следовать за играющей песней";
LANG.PAGINATION_NOFOLLOW= "Не следовать за играющей песней";

LANG.LYRICWIKI_LYRIC	= "Текст %s с lyrics.wikia.com";  // add/edit lyric at ..

// ERRORS
LANG.E_CONNECT		="Не получается подключиться к MPD серверу";
LANG.E_INVALID_RESPONSE	="Сервер вернул неправильный ответ";
LANG.E_INVALID_RESULT	="Неправильный результат от сервера";
LANG.E_NO_RESPONSE	="Не получен ответ от сервера";
LANG.E_INIT		="Инициализация не удалась "
LANG.E_INIT_PL		="Не удалось инициализировать плейлист";
LANG.E_PL_MOVE		="Переход к плейлисту не удался";
LANG.E_REMOVE		="Не удалось удалить песни";
LANG.E_FAILED_ADD	="Не удалось добавить";
LANG.E_FAILED_ADD_PL	="Не удалось добавить плейлист";
LANG.E_FAILED_SAVE_PL	="Не удалось сохранить плейлист";
LANG.E_FAILED_LOAD_DIR	="Не удалось загрузить список директорий";
LANG.E_NOTHING_FOUND	="Ничего не найдено..";
LANG.E_NO_OUTPUTS	="Не найдены выходы";
LANG.E_NOT_FOUND	="Не найдены %s."; // We didn't find any of these
LANG.E_MISSING_CACHE	="Директория кэша отсутствует";
LANG.E_MISSING_AA_NAME	="Отсутствует артист или название альбома.";
LANG.E_MISSING_AS_NAME	="Отсутствует артист или название песни.";
LANG.E_LYRICS_NOT_FOUND	="Текст песни не найден";
LANG.E_MISSING_LYRICS	="Текст песни отсутствует.."; // this should be something better
LANG.E_LYRICS_FAILURE	="Не удалось получить текст песни";
LANG.E_COMM_PROBLEM	="Проблема со связью";
LANG.E_GET_INFO		="Не удалось получить информацию";

LANG.RECOMMEND_RECOMMENDATIONS	= "Рекоммендации ";
LANG.RECOMMEND_EMPTY_PLAYLIST	="Чтобы получить рекоммендации на основе своего плейлиста, он должен быть не пустым";
LANG.RECOMMEND_ADDTOPLAYLIST	="Добавить в плейлист";
LANG.RECOMMEND_SIMILAR		="Похожие артисты из вашей библиотеки";
LANG.RECOMMEND_ARTISTS		="Рекоммендуемые артисты";


/* Don't need translation, but needs to be here: */
LANG.NT_AMAZON = "[Amazon.com]";
