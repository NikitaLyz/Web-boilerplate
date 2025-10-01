
(function () {

  const COURSE_POOL = [
    "Mathematics","Physics","English","Computer Science","Dancing","Chess",
    "Biology","Chemistry","Law","Art","Medicine","Statistics"
  ];
  const randItem = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const randPastelHex = () => {
    const r = 200 + Math.floor(Math.random() * 56);
    const g = 200 + Math.floor(Math.random() * 56);
    const b = 200 + Math.floor(Math.random() * 56);
    return `#${[r,g,b].map(x => x.toString(16).padStart(2,'0')).join('')}`;
  };
  const genId = () => (crypto?.randomUUID ? crypto.randomUUID() : 'id-' + Math.random().toString(36).slice(2));
  const isString = (v) => typeof v === 'string';
  const isNumber = (v) => typeof v === 'number' && !Number.isNaN(v);
  const startsWithCapital = (s) => isString(s) && s.length
    ? (s[0].toUpperCase() === s[0] && s[0].toLowerCase() !== s[0]) : false;
  const emailOk = (s) => isString(s) && /.+@.+\..+/.test(s);

  const phonePatterns = {
    Germany:/^\d{4}-\d{7}$/, Ukraine:/^\+?380\d{9}$/, USA:/^(\+?1[-.\s]?)?(\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}$/,
    England:/^(\+?44|0)\d{10}$/, Scotland:/^(\+?44|0)\d{10}$/, France:/^(\+?33|0)\d{9}$/,
    Netherlands:/^(\+?31|0)\d{9}$/, India:/^(\+?91)?[6-9]\d{9}$/, China:/^(\+?86)?1[3-9]\d{9}$/,
    Italy:/^(\+?39)?\d{9,10}$/, Austria:/^(\+?43)?\d{9,11}$/, Ireland:/^(\+?353|0)\d{9,10}$/
  };
  const phoneFallback = /^\+?[0-9()\-\s]{7,}$/;
  const phoneOk = (phone, country) => isString(phone) && (phonePatterns[country] || phoneFallback).test(phone.trim());
  const toComparable = (v) => {
    if (v == null) return null;
    if (isNumber(v)) return v;
    const d = new Date(v);
    if (!Number.isNaN(d.getTime())) return d.getTime();
    return String(v).toLowerCase();
  };
  const REGIONS = {
    Europe:['Ukraine','Belarus','England','Denmark','Ireland','Scotland','France','Austria','Italy','Netherlands'],
    Asia:['China','India','Vietnam'],
    'North America':['USA','Canada','Mexico'],
    'South America':['Brazil','Argentina','Chile'],
    Africa:['Egypt','South Africa','Morocco'],
    Oceania:['Australia','New Zealand']
  };
  const normalize = (str) => String(str || '').trim().toLowerCase();

  const computeAge = (u) => {
    if (isNumber(u?.age)) return u.age;
    if (!u?.b_date) return undefined;
    const d = new Date(u.b_date);
    if (Number.isNaN(+d)) return undefined;
    const now = new Date();
    let a = now.getFullYear() - d.getFullYear();
    const m = now.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < d.getDate())) a--;
    return a;
  };

  // ===== prepare/merge
  const makeKey = (u) =>
    (u?.email && String(u.email).toLowerCase()) ||
    (u?.phone && String(u.phone)) ||
    (u?.full_name && u?.b_date && (String(u.full_name).toLowerCase() + '|' + String(u.b_date))) ||
    (u?.picture_large && String(u.picture_large).toLowerCase()) ||
    JSON.stringify(u).slice(0, 80);

  function prepareUsers(randomUsers = [], additionalUsers = []) {
    const map = new Map();
    const push = (src) => {
      for (const raw of src || []) {
        const clone = { ...raw };
        if (!clone.id) clone.id = genId();
        clone.favorite = clone.hasOwnProperty('favorite') ? Boolean(clone.favorite) : false;
        if (!clone.course || !isString(clone.course)) clone.course = randItem(COURSE_POOL);
        if (!clone.bg_color || !isString(clone.bg_color)) clone.bg_color = randPastelHex();
        if (!clone.note || !isString(clone.note)) clone.note = "";
        if (clone.name && !clone.full_name) clone.full_name = clone.name;
        if (clone.birth || clone.b_day) clone.b_date = clone.b_date || clone.birth || clone.b_day;
        const key = makeKey(clone);
        map.set(key, map.has(key) ? { ...map.get(key), ...clone } : clone);
      }
    };
    push(randomUsers);
    push(additionalUsers);
    return [...map.values()];
  }

function mapRandomUser(r) {
  
  const full_name = `${r.name.first} ${r.name.last}`;
  return {
    id: r.login?.uuid || (window.Core?.genId ? Core.genId() : ('id-'+Math.random().toString(36).slice(2))),
    full_name,
    gender: (r.gender || '').charAt(0).toUpperCase() + (r.gender || '').slice(1),
    country: r.location?.country || '—',
    city: r.location?.city || '',
    state: r.location?.state || '',
    speciality: '',           // у randomuser нет — оставляем пустым
    age: r.dob?.age ?? undefined,
    b_date: r.dob?.date ? r.dob.date.slice(0,10) : '',
    email: r.email || '',
    phone: r.phone || r.cell || '',
    picture_large: r.picture?.large || '',
    picture_thumbnail: r.picture?.thumbnail || '',
    note: '',
    favorite: false,
    bg_color: '',
    coordinates: r.location?.coordinates ? {
      latitude: String(r.location.coordinates.latitude),
      longitude: String(r.location.coordinates.longitude),
    } : undefined,
    timezone: r.location?.timezone ? {
      offset: r.location.timezone.offset,
      description: r.location.timezone.description
    } : undefined
  };
}
window.Core = window.Core || {};
Object.assign(window.Core, { mapRandomUser });

  // ===== validate
  function validateUser(u = {}) {
    const fields = {};
    ['full_name','gender','note','state','city','country'].forEach(f => {
      fields[f] = isString(u[f]) && startsWithCapital(u[f]);
    });
    fields.age = isNumber(u.age);
    fields.email = emailOk(u.email);
    fields.phone = phoneOk(u.phone, u.country);
    let latOk=false, lonOk=false;
    if (u.coordinates && isString(u.coordinates.latitude) && isString(u.coordinates.longitude)) {
      const lat = Number(u.coordinates.latitude), lon = Number(u.coordinates.longitude);
      latOk = !Number.isNaN(lat) && lat <= 90 && lat >= -90;
      lonOk = !Number.isNaN(lon) && lon <= 180 && lon >= -180;
    }
    fields.coordinates = Boolean(u.coordinates) && latOk && lonOk;
    fields.timezone = Boolean(u.timezone && isString(u.timezone.offset) && isString(u.timezone.description));
    const d = new Date(u.b_date); fields.b_date = isString(u.b_date) && !Number.isNaN(d.getTime());
    const picLargeOk = u.picture_large == null || isString(u.picture_large);
    const picThumbOk = u.picture_thumbnail == null || isString(u.picture_thumbnail);
    fields.pictures = picLargeOk && picThumbOk;
    const invalid = Object.entries(fields).filter(([,ok])=>!ok).map(([k])=>k);
    return { valid: invalid.length===0, fields, message: invalid.length ? invalid : ['OK'] };
  }

  // ===== filter
  function filterUsers(users = [], crit = {}) {
    const { country, region, gender, favorite, photo, age, ageMin, ageMax } = crit;
    let min = ageMin, max = ageMax;
    if (typeof age === 'number') { min = max = age; }
    else if (age && typeof age === 'object') { if (age.min != null) min = age.min; if (age.max != null) max = age.max; }
    return users.filter(u => {
      if (country && normalize(u.country) !== normalize(country)) return false;
      if (region) {
        const allowed = REGIONS[region] || [];
        if (!allowed.includes(u.country)) return false;
      }
      if (gender && normalize(gender) !== 'any' && normalize(u.gender) !== normalize(gender)) return false;
      if (typeof favorite === 'boolean' && !!u.favorite !== favorite) return false;
      if (photo && !(u.picture_large || u.picture_thumbnail)) return false;
      const ua = computeAge(u);
      if (min != null && !(ua >= min)) return false;
      if (max != null && !(ua <= max)) return false;
      return true;
    });
  }

  // ===== sort
  function sortUsers(users = [], field = 'full_name', dir = 'asc') {
    const f = (field === 'b_day') ? 'b_day' : (field === 'b_date' ? 'b_date' : field);
    const mult = dir === 'desc' ? -1 : 1;
    return [...users].sort((a, b) => {
      let av, bv;
      if (f === 'b_day' || f === 'b_date') {
        av = new Date(a[f] ?? a['b_date'] ?? a['b_day']).getTime();
        bv = new Date(b[f] ?? b['b_date'] ?? b['b_day']).getTime();
      } else if (f === 'age') {
        av = computeAge(a) ?? Number(a.age);
        bv = computeAge(b) ?? Number(b.age);
      } else {
        av = String(a[f] ?? '').toLowerCase();
        bv = String(b[f] ?? '').toLowerCase();
      }
      if (av == null && bv == null) return 0;
      if (av == null) return 1 * mult;
      if (bv == null) return -1 * mult;
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * mult;
      return String(av).localeCompare(String(bv)) * mult;
    });
  }

  // ===== find one
  function findUser(users = [], param) {
    if (param == null) return null;
    if (typeof param === 'object' && param.field) {
      const { field:f, value:v } = param;
      if (f === 'age') {
        const n = Number(v);
        return users.find(u => (computeAge(u) ?? Number(u.age)) === n) || null;
      }
      if (f === 'name' || f === 'full_name') {
        const needle = String(v).toLowerCase();
        return users.find(u => String(u.full_name || u.name || '').toLowerCase().includes(needle)) || null;
      }
      if (f === 'note') {
        const needle = String(v).toLowerCase();
        return users.find(u => String(u.note || '').toLowerCase().includes(needle)) || null;
      }
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
      return users.find(u => (computeAge(u) ?? Number(u.age)) === param) || null;
    }
    return null;
  }

  // ===== percent
  function percentMatch(users = [], predicateOrFilters) {
    if (!Array.isArray(users) || users.length === 0) return 0;
    const matched = typeof predicateOrFilters === 'function'
      ? users.filter(predicateOrFilters).length
      : filterUsers(users, predicateOrFilters || {}).length;
    return Math.round((matched / users.length) * 100);
  }

  // ---- Экспорт: и в Core, и в App (чтобы DOM-код видел в обоих неймспейсах)
  const Core = {
    prepareUsers, validateUser, filterUsers, sortUsers,
    findUser, percentMatch, REGIONS, normalize, toComparable,
    COURSE_POOL, randPastelHex, genId, startsWithCapital, emailOk, phoneOk
  };
  // ——— Хелперы для нормализации (в том же файле где validateUser)
const CoreCap = s => String(s||'').trim().replace(/^./, c => c.toUpperCase());

// country → координаты/таймзона (по желанию, можно оставить пустым)
const CORE_GEO = {
  Ukraine:  { state:'Kyiv Oblast', city:'Kyiv',     lat:'50.4501', lon:'30.5234', tz:'+02:00', tzDesc:'Kyiv' },
  Belarus:  { state:'Minsk Region',city:'Minsk',    lat:'53.9006', lon:'27.5590', tz:'+03:00', tzDesc:'Minsk' },
  England:  { state:'Greater London',city:'London', lat:'51.5074', lon:'-0.1278', tz:'+00:00', tzDesc:'London' },
  China:    { state:'Beijing',      city:'Beijing', lat:'39.9042', lon:'116.4074', tz:'+08:00', tzDesc:'Beijing' },
  Denmark:  { state:'Capital Region',city:'Copenhagen', lat:'55.6761', lon:'12.5683', tz:'+01:00', tzDesc:'Copenhagen' },
  USA:      { state:'Illinois',     city:'Chicago', lat:'41.8781', lon:'-87.6298', tz:'-06:00', tzDesc:'Chicago' },
};

// Фабрика: строит и валидирует нового преподавателя
function makeTeacher(raw = {}, opts = {}) {
  // opts: { inferGeo: true|false } — подставлять ли дефолтные geo/таймзону по стране
  const inferGeo = opts.inferGeo !== false;

  const t = {
    id: raw.id || (typeof genId === 'function' ? genId() : ('id-' + Math.random().toString(36).slice(2))),
    full_name: CoreCap(raw.full_name || raw.name || 'New Teacher'),
    speciality: raw.speciality || raw.course || '',
    country: CoreCap(raw.country || ''),
    city: CoreCap(raw.city || ''),
    state: CoreCap(raw.state || ''),
    gender: (raw.gender || '').toString(),          // валидатор сам проверит caps, это поле опционально
    email: String(raw.email || '').trim(),
    phone: String(raw.phone || '').trim(),
    b_date: raw.b_date || raw.birth || raw.b_day || '',
    bg_color: raw.bg_color || '',
    note: CoreCap(raw.note || ''),
    picture_large: raw.picture_large || '',
    picture_thumbnail: raw.picture_thumbnail || '',
    favorite: !!raw.favorite,
    coordinates: raw.coordinates,                   // может быть undefined — это ок
    timezone: raw.timezone                          // может быть undefined — это ок
  };

  // Если координаты/таймзона не заданы — можем подставить по стране (упростит прохождение валидации, но не обязательно)
  if (inferGeo && (!t.coordinates || !t.timezone) && t.country && CORE_GEO[t.country]) {
    const g = CORE_GEO[t.country];
    if (!t.state) t.state = g.state;
    if (!t.city)  t.city  = g.city;
    if (!t.coordinates) t.coordinates = { latitude: String(g.lat), longitude: String(g.lon) };
    if (!t.timezone)    t.timezone    = { offset: String(g.tz), description: String(g.tzDesc) };
  }

  // Возраст (если не пришёл) — считаем из b_date
  const a = (typeof computeAge === 'function') ? computeAge(t) : undefined;
  if (Number.isFinite(a)) t.age = a; else if (Number.isFinite(raw.age)) t.age = Number(raw.age);

  // Валидация
  const v = validateUser(t);
  if (!v.valid) {
    return { ok: false, errors: v.message, value: null };
  }
  return { ok: true, errors: [], value: t };
}

// Удобный помощник: добавляет в массив, если прошло валидацию
function addTeacher(list, raw, opts) {
  const res = makeTeacher(raw, opts);
  if (res.ok) list.push(res.value);
  return res;
}

// Экспорт в Core-неймспейс
window.Core = window.Core || {};
Object.assign(window.Core, {
  makeTeacher,
  addTeacher,
  CORE_GEO, // если захочешь расширять снаружи
});

  window.Core = Core;
  window.App = window.App || {};
  window.App.core = Core;
  // Для удобства — продублируем методы и в App напрямую:
  Object.assign(window.App, Core);
})();
