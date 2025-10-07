


(function () {
  // ----- Допоміжні -----
  const COURSE_POOL = [
    "Mathematics","Physics","English","Computer Science","Dancing","Chess",
    "Biology","Chemistry","Law","Art","Medicine","Statistics"
  ];

  const randItem = (arr) => arr[Math.floor(Math.random() * arr.length)];

  const randPastelHex = () => {
    // Трохи пастельний колір
    const r = 200 + Math.floor(Math.random() * 56);
    const g = 200 + Math.floor(Math.random() * 56);
    const b = 200 + Math.floor(Math.random() * 56);
    return `#${[r,g,b].map(x => x.toString(16).padStart(2,'0')).join('')}`;
  };

  const genId = () => (crypto?.randomUUID ? crypto.randomUUID() :
                       'id-' + Math.random().toString(36).slice(2));

  const isString = (v) => typeof v === 'string';
  const isNumber = (v) => typeof v === 'number' && !Number.isNaN(v);

  const startsWithCapital = (s) => {
    if (!isString(s) || !s.length) return false;
    const c = s[0];
    // літера і вона ж у верхньому регістрі
    return c.toUpperCase() === c && c.toLowerCase() !== c;
  };

  const emailOk = (s) => isString(s) && /.+@.+\..+/.test(s);

  const phonePatterns = {
    Germany:      /^\d{4}-\d{7}$/,                 // напр. "0079-8291509" (з прикладу)
    Ukraine:      /^\+?380\d{9}$/,
    USA:          /^(\+?1[-.\s]?)?(\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}$/,
    England:      /^(\+?44|0)\d{10}$/,
    Scotland:     /^(\+?44|0)\d{10}$/,
    France:       /^(\+?33|0)\d{9}$/,
    Netherlands:  /^(\+?31|0)\d{9}$/,
    India:        /^(\+?91)?[6-9]\d{9}$/,
    China:        /^(\+?86)?1[3-9]\d{9}$/,
    Italy:        /^(\+?39)?\d{9,10}$/,
    Austria:      /^(\+?43)?\d{9,11}$/,
    Ireland:      /^(\+?353|0)\d{9,10}$/
  };
  const phoneFallback = /^\+?[0-9()\-\s]{7,}$/;

  const phoneOk = (phone, country) => {
    if (!isString(phone)) return false;
    const re = phonePatterns[country] || phoneFallback;
    return re.test(phone.trim());
  };

  const toComparable = (v) => {
    if (v == null) return null;
    if (isNumber(v)) return v;
    // пробуємо дату
    const d = new Date(v);
    if (!Number.isNaN(d.getTime())) return d.getTime();
    // інакше — рядок
    return String(v).toLowerCase();
  };

  // Ключ для дедуплікації: email -> phone -> full_name+b_date -> picture
  const makeKey = (u) =>
    (u?.email && String(u.email).toLowerCase()) ||
    (u?.phone && String(u.phone)) ||
    (u?.full_name && u?.b_date && (String(u.full_name).toLowerCase() + '|' + String(u.b_date))) ||
    (u?.picture_large && String(u.picture_large).toLowerCase()) ||
    JSON.stringify(u).slice(0, 80); // найгірший випадок

  // ----- 1) Підготовка/мерж -----
  /**
   * Нормалізує та мерджить 2 масиви.
   * Додає: id (string), favorite (boolean), course (string), bg_color (string "#RRGGBB"), note (string)
   * @returns Array<object>
   */
  function prepareUsers(randomUsers = [], additionalUsers = []) {
    const map = new Map();
    const push = (src) => {
      for (const raw of src || []) {
        const clone = { ...raw };

        // Додаткові поля (з правильними типами)
        if (!clone.id) clone.id = genId();
        clone.favorite = Boolean(clone.favorite); // якщо було щось — каст до boolean
        if (!clone.hasOwnProperty('favorite')) clone.favorite = false;

        if (!clone.course || !isString(clone.course)) clone.course = randItem(COURSE_POOL);
        if (!clone.bg_color || !isString(clone.bg_color)) clone.bg_color = randPastelHex();
        if (!clone.note || !isString(clone.note)) clone.note = "";

        // Уніфікація можливих альтернативних назв полів:
        if (clone.name && !clone.full_name) clone.full_name = clone.name;
        if (clone.birth || clone.b_day) clone.b_date = clone.b_date || clone.birth || clone.b_day;

        // Дедуп: за ключем
        const key = makeKey(clone);
        if (!map.has(key)) {
          map.set(key, clone);
        } else {
          // Якщо дублікат — об’єднуємо поля (перевага новішого, але не затираємо істинно значущі)
          const prev = map.get(key);
          map.set(key, { ...prev, ...clone });
        }
      }
    };

    push(randomUsers);
    push(additionalUsers);

    // Повертаємо масив
    return [...map.values()];
  }

  // ----- 2) Валідація -----
  /**
   * Перевіряє, чи відповідає об'єкт вимогам.
   * Правила:
   * - full_name, gender, note, state, city, country — строки, починаються з великої літери
   * - age — число
   * - phone — відповідає формату країни (якщо країна відома), інакше fallback
   * - email — має '@' та базову структуру
   * - coordinates.latitude/longitude — рядкові числові значення (можуть бути з мінусом і крапкою)
   * Повертає: { valid: boolean, fields: {fieldName: boolean}, message?: string[] }
   */
  function validateUser(u = {}) {
    const fields = {};

    const wantCaps = ['full_name', 'gender', 'note', 'state', 'city', 'country'];
    for (const f of wantCaps) {
      fields[f] = isString(u[f]) && startsWithCapital(u[f]);
    }

    fields.age = isNumber(u.age);
    fields.email = emailOk(u.email);

    // phone залежить від країни (якщо країна є)
    const country = u.country;
    fields.phone = phoneOk(u.phone, country);

    // coordinates (рядки, але числові)
    let latOk = false, lonOk = false;
    if (u.coordinates && isString(u.coordinates.latitude) && isString(u.coordinates.longitude)) {
      const lat = Number(u.coordinates.latitude);
      const lon = Number(u.coordinates.longitude);
      latOk = !Number.isNaN(lat) && lat <= 90 && lat >= -90;
      lonOk = !Number.isNaN(lon) && lon <= 180 && lon >= -180;
    }
    fields.coordinates = Boolean(u.coordinates) && latOk && lonOk;

    // timezone — базова перевірка (наявність offset та description)
    fields.timezone = Boolean(u.timezone && isString(u.timezone.offset) && isString(u.timezone.description));

    // b_date — валідна дата (рядок з ISO або хоч би парситься)
    const d = new Date(u.b_date);
    fields.b_date = isString(u.b_date) && !Number.isNaN(d.getTime());

    // решта лінків (картинки) – мають бути рядками, якщо задані
    const picLargeOk = u.picture_large == null || isString(u.picture_large);
    const picThumbOk = u.picture_thumbnail == null || isString(u.picture_thumbnail);
    fields.pictures = picLargeOk && picThumbOk;

    const invalidList = Object.entries(fields)
      .filter(([, ok]) => !ok)
      .map(([k]) => k);

    return {
      valid: invalidList.length === 0,
      fields,
      message: invalidList.length ? invalidList : ["OK"]
    };
  }

  // ----- 3) Фільтрація (AND) -----
  /**
   * @param {Array<object>} users
   * @param {object} params  { country?: string, age?: number|{min?:n,max?:n}, gender?: string, favorite?: boolean }
   * Всі зазначені параметри працюють як AND.
   */
  function filterUsers(users = [], params = {}) {
    const { country, age, gender, favorite } = params;

    return users.filter(u => {
      if (country && String(u.country).toLowerCase() !== String(country).toLowerCase()) return false;

      if (gender && String(u.gender).toLowerCase() !== String(gender).toLowerCase()) return false;

      if (typeof favorite === 'boolean' && Boolean(u.favorite) !== favorite) return false;

      if (age != null) {
        if (isNumber(age)) {
          if (Number(u.age) !== age) return false;
        } else if (typeof age === 'object') {
          const ua = Number(u.age);
          if (!Number.isFinite(ua)) return false;
          if (age.min != null && ua < age.min) return false;
          if (age.max != null && ua > age.max) return false;
        }
      }
      return true;
    });
  }

  // ----- 4) Сортування -----
  /**
   * @param {Array<object>} users
   * @param {string} field  one of: "full_name","age","b_day","b_date","country"
   * @param {'asc'|'desc'} dir
   */
  function sortUsers(users = [], field = 'full_name', dir = 'asc') {
    const f = (field === 'b_day') ? 'b_day' : (field === 'b_date' ? 'b_date' : field);
    const mult = dir === 'desc' ? -1 : 1;

    // Копіюємо, щоб не мутувати вхід
    return [...users].sort((a, b) => {
      let av, bv;

      if (f === 'b_day' || f === 'b_date') {
        const ad = new Date(a[f] ?? a['b_date'] ?? a['b_day']);
        const bd = new Date(b[f] ?? b['b_date'] ?? b['b_day']);
        av = ad.getTime();
        bv = bd.getTime();
      } else if (f === 'age') {
        av = Number(a.age);
        bv = Number(b.age);
      } else { // рядки: full_name, country, тощо
        av = String(a[f] ?? '').toLowerCase();
        bv = String(b[f] ?? '').toLowerCase();
      }

      if (av == null && bv == null) return 0;
      if (av == null) return 1 * mult;
      if (bv == null) return -1 * mult;

      if (typeof av === 'number' && typeof bv === 'number') {
        return (av - bv) * mult;
      }
      // рядкове порівняння
      return av.localeCompare(bv) * mult;
    });
  }

  // ----- 5) Пошук одного елемента -----
  /**
   * Знаходить ПЕРШИЙ об'єкт, що відповідає параметру:
   *   - {field:'name'|'full_name'|'note'|'age', value:any}
   *   - або просто значення: якщо string -> шукає у full_name та note (містить, case-insensitive)
   *                           якщо number -> шукає точний збіг у age
   */
  function findUser(users = [], param) {
    if (param == null) return null;

    if (typeof param === 'object' && param.field) {
      const f = param.field;
      const v = param.value;
      if (f === 'age') {
        const n = Number(v);
        return users.find(u => Number(u.age) === n) || null;
      }
      if (f === 'name' || f === 'full_name') {
        const needle = String(v).toLowerCase();
        return users.find(u => String(u.full_name || u.name || '').toLowerCase().includes(needle)) || null;
      }
      if (f === 'note') {
        const needle = String(v).toLowerCase();
        return users.find(u => String(u.note || '').toLowerCase().includes(needle)) || null;
      }
      // fallback: точний збіг
      return users.find(u => String(u[f]) === String(v)) || null;
    }

    if (typeof param === 'string') {
      const needle = param.toLowerCase();
      return users.find(u =>
        String(u.full_name || u.name || '').toLowerCase().includes(needle) ||
        String(u.note || '').toLowerCase().includes(needle)
      ) || null;
    }

    if (typeof param === 'number') {
      return users.find(u => Number(u.age) === param) || null;
    }
    return null;
  }

  // ----- 6) Відсоток збігів -----
  /**
   * Рахує відсоток елементів, що відповідають умові.
   * Можна передати або функцію-предикат, або об'єкт фільтрів як у filterUsers().
   * @returns number (0..100) з округленням до найближчого цілого
   */
  function percentMatch(users = [], predicateOrFilters) {
    if (!Array.isArray(users) || users.length === 0) return 0;

    let matched = 0;
    if (typeof predicateOrFilters === 'function') {
      matched = users.filter(predicateOrFilters).length;
    } else {
      matched = filterUsers(users, predicateOrFilters || {}).length;
    }
    return Math.round((matched / users.length) * 100);
  }

  
  window.App = {
    prepareUsers,
    validateUser,
    filterUsers,
    sortUsers,
    findUser,
    percentMatch
  };



})();
