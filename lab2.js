(function () {
  // ================== КОНСТАНТЫ/ХЕЛПЕРЫ ==================
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

  const genId = () => (crypto?.randomUUID ? crypto.randomUUID()
                                          : 'id-' + Math.random().toString(36).slice(2));

  const isString = (v) => typeof v === 'string';
  const isNumber = (v) => typeof v === 'number' && !Number.isNaN(v);

  const startsWithCapital = (s) => {
    if (!isString(s) || !s.length) return false;
    const c = s[0];
    return c.toUpperCase() === c && c.toLowerCase() !== c;
  };

  const emailOk = (s) => isString(s) && /.+@.+\..+/.test(s);

  const phonePatterns = {
    Germany:      /^\d{4}-\d{7}$/,                 
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
    const d = new Date(v);
    if (!Number.isNaN(d.getTime())) return d.getTime();
    return String(v).toLowerCase();
  };

  const REGIONS = {
    'Europe': ['Ukraine','Belarus','England','Denmark','Ireland','Scotland','France','Austria','Italy','Netherlands'],
    'Asia': ['China','India','Vietnam'],
    'North America': ['USA','Canada','Mexico'],
    'South America': ['Brazil','Argentina','Chile'],
    'Africa': ['Egypt','South Africa','Morocco'],
    'Oceania': ['Australia','New Zealand']
  };

  function normalize(str) { return String(str || '').trim().toLowerCase(); }

  // Возраст — из age или вычислить из b_date
  function computeAge(u){
    if (isNumber(u?.age)) return u.age;
    if (!u?.b_date) return undefined;
    const d = new Date(u.b_date);
    if (Number.isNaN(+d)) return undefined;
    const now = new Date();
    let a = now.getFullYear() - d.getFullYear();
    const m = now.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < d.getDate())) a--;
    return a;
  }

  // ================== 1) ПОДГОТОВКА / MERGE ==================
  const makeKey = (u) =>
    (u?.email && String(u.email).toLowerCase()) ||
    (u?.phone && String(u.phone)) ||
    (u?.full_name && u?.b_date && (String(u.full_name).toLowerCase() + '|' + String(u.b_date))) ||
    (u?.picture_large && String(u.picture_large).toLowerCase()) ||
    JSON.stringify(u).slice(0, 80);

  /**
   * Нормализует и сливает 2 массива пользователей.
   * Добавляет: id, favorite, course, bg_color, note
   */
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
        if (!map.has(key)) {
          map.set(key, clone);
        } else {
          const prev = map.get(key);
          map.set(key, { ...prev, ...clone });
        }
      }
    };

    push(randomUsers);
    push(additionalUsers);
    return [...map.values()];
  }

  // ================== 2) ВАЛИДАЦИЯ ==================
  function validateUser(u = {}) {
    const fields = {};

    const wantCaps = ['full_name', 'gender', 'note', 'state', 'city', 'country'];
    for (const f of wantCaps) {
      fields[f] = isString(u[f]) && startsWithCapital(u[f]);
    }

    fields.age = isNumber(u.age);
    fields.email = emailOk(u.email);
    fields.phone = phoneOk(u.phone, u.country);

    let latOk = false, lonOk = false;
    if (u.coordinates && isString(u.coordinates.latitude) && isString(u.coordinates.longitude)) {
      const lat = Number(u.coordinates.latitude);
      const lon = Number(u.coordinates.longitude);
      latOk = !Number.isNaN(lat) && lat <= 90 && lat >= -90;
      lonOk = !Number.isNaN(lon) && lon <= 180 && lon >= -180;
    }
    fields.coordinates = Boolean(u.coordinates) && latOk && lonOk;

    fields.timezone = Boolean(u.timezone && isString(u.timezone.offset) && isString(u.timezone.description));

    const d = new Date(u.b_date);
    fields.b_date = isString(u.b_date) && !Number.isNaN(d.getTime());

    const picLargeOk = u.picture_large == null || isString(u.picture_large);
    const picThumbOk = u.picture_thumbnail == null || isString(u.picture_thumbnail);
    fields.pictures = picLargeOk && picThumbOk;

    const invalidList = Object.entries(fields).filter(([, ok]) => !ok).map(([k]) => k);

    return {
      valid: invalidList.length === 0,
      fields,
      message: invalidList.length ? invalidList : ["OK"]
    };
  }

  // ================== 3) ФИЛЬТРАЦИЯ (единая) ==================
  /**
   * Универсальный AND-фильтр.
   * crit:
   *  - country?: string
   *  - region?: 'Europe'|'Asia'|...
   *  - gender?: 'Male'|'Female'|'Any'
   *  - favorite?: boolean
   *  - photo?: boolean                    // только с фото
   *  - age?: number | {min?:n,max?:n}
   *  - ageMin?: number, ageMax?: number
   */
  function filterUsers(users = [], crit = {}) {
    const {
      country, region,
      gender, favorite, photo,
      age, ageMin, ageMax
    } = crit;

    // привести к min/max
    let min = ageMin, max = ageMax;
    if (typeof age === 'number') { min = max = age; }
    else if (age && typeof age === 'object') {
      if (age.min != null) min = age.min;
      if (age.max != null) max = age.max;
    }

    return users.filter(u => {
      if (country && normalize(u.country) !== normalize(country)) return false;

      if (region) {
        const allowed = REGIONS[region] || [];
        if (!allowed.includes(u.country)) return false;
      }

      if (gender && normalize(gender) !== 'any' && normalize(u.gender) !== normalize(gender)) {
        return false;
      }

      if (typeof favorite === 'boolean' && Boolean(u.favorite) !== favorite) return false;

      if (photo && !(u.picture_large || u.picture_thumbnail)) return false;

      const ua = computeAge(u);
      if (min != null && !(ua >= min)) return false;
      if (max != null && !(ua <= max)) return false;

      return true;
    });
  }

  // ================== 4) СОРТИРОВАНИЕ ==================
  /**
   * field: "full_name"|"age"|"b_day"|"b_date"|"country"
   * dir: "asc"|"desc"
   */
  function sortUsers(users = [], field = 'full_name', dir = 'asc') {
    const f = (field === 'b_day') ? 'b_day' : (field === 'b_date' ? 'b_date' : field);
    const mult = dir === 'desc' ? -1 : 1;

    return [...users].sort((a, b) => {
      let av, bv;

      if (f === 'b_day' || f === 'b_date') {
        const ad = new Date(a[f] ?? a['b_date'] ?? a['b_day']);
        const bd = new Date(b[f] ?? b['b_date'] ?? b['b_day']);
        av = ad.getTime();
        bv = bd.getTime();
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

      if (typeof av === 'number' && typeof bv === 'number') {
        return (av - bv) * mult;
      }
      return String(av).localeCompare(String(bv)) * mult;
    });
  }

  // ================== 5) ПОИСК ОДНОГО ==================
  /**
   * findUser(users, {field:'name'|'full_name'|'note'|'age', value:any})
   * findUser(users, 'строка') — ищет в name/note (вхождение)
   * findUser(users, 34) — точный возраст
   */
  function findUser(users = [], param) {
    if (param == null) return null;

    if (typeof param === 'object' && param.field) {
      const f = param.field;
      const v = param.value;
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

  // ================== 6) ПРОЦЕНТ СОВПАДЕНИЙ ==================
  /**
   * percentMatch(users, predicateOrFilters)
   * - принимает предикат или объект фильтров (как у filterUsers)
   * - возвращает 0..100 (округлённое)
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

  window.App = window.App || {};
  Object.assign(window.App, {
    prepareUsers,
    validateUser,
    filterUsers,     
    sortUsers,
    findUser,
    percentMatch,
    REGIONS,
    normalize,
    toComparable
  });
  (function () {
  // ====== 0) ДАННЫЕ (если хочешь — можешь перенести их сюда из HTML) ======
  // Если на странице уже объявлены random_user_mock/additional_users — используем их.
  // Если нет — создадим дефолт.
  const fallbackRandomUsers = [
    { full_name:"Ihor Tkachuk", gender:"male", country:"Ukraine", city:"Kyiv", speciality:"Chemistry", age:40, email:"ihor@domain.com", phone:"+380991112233", b_date:"1984-05-12", picture_large:"https://tse2.mm.bing.net/th/id/OIP.gBsZ_GdxmnWC1pF7gtJ8sAHaFD", note:"Teacher of chemistry" },
    { full_name:"Anna Makarevich", gender:"Female", country:"Belarus", city:"Minsk", speciality:"Math", age:31, email:"anna@domain.com", b_date:"1993-03-01", picture_large:"https://i.pravatar.cc/520?img=6" },
    { full_name:"John Burke", gender:"Male", country:"England", city:"London", speciality:"Physics", age:36, email:"john@domain.com", b_date:"1989-11-23", picture_large:"https://thumbs.dreamstime.com/b/portrait-young-male-teacher-background-school-blackboard-teacher-s-day-knowledge-day-back-to-school-study-159722312.jpg" },
    { full_name:"Ari Tang", gender:"Female", country:"China", city:"Beijing", speciality:"Biology", age:39, email:"ari@domain.com", b_date:"1986-07-20", picture_large:"https://i.pravatar.cc/520?img=5" },
    { full_name:"Floor Jansen", gender:"Female", country:"Denmark", city:"Copenhagen", speciality:"PE", age:35, email:"floor@domain.com", b_date:"1990-02-17", picture_large:"https://i.pravatar.cc/520?img=3", favorite:true },
  ];
  const fallbackAdditional = [
    { full_name:"Julia Bradley", gender:"Female", country:"USA", speciality:"Math", age:26, email:"julia@domain.com" },
    { full_name:"Nathaniel White", gender:"Male", country:"Austria", speciality:"Computer Science", age:37, email:"nathaniel@domain.com" },
    { full_name:"Frank Medina", gender:"Male", country:"Italy", speciality:"English", age:43, email:"frank@domain.com" },
    { full_name:"Claire Simmmons", gender:"Female", country:"Netherlands", speciality:"Art", age:38, email:"claire@domain.com" }
  ];

  // ====== 1) УТИЛИТЫ/CORE ======
  const isNumber = v => typeof v === 'number' && !Number.isNaN(v);
  const normalize = s => String(s ?? '').trim().toLowerCase();

  function computeAge(u){
    if (isNumber(u.age) && u.age > 0) return u.age;
    if (!u.b_date) return undefined;
    const d = new Date(u.b_date);
    if (Number.isNaN(+d)) return undefined;
    const now = new Date();
    let a = now.getFullYear() - d.getFullYear();
    const m = now.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < d.getDate())) a--;
    return a;
  }

  const hasPhoto = u => !!u.picture_large;
  const initials = name => name.split(/\s+/).map(s=>s[0]?.toUpperCase()||'').slice(0,2).join('.') || 'N/A';

  // единый фильтр (country, gender, favorite, photo, ageRanges)
  const inAgeRange = (age, opt) => {
    if (!opt) return true; // Any
    switch(opt){
      case '18-31': return age>=18 && age<=31;
      case '32-45': return age>=32 && age<=45;
      case '46-60': return age>=46 && age<=60;
      case '60+':   return age>=60;
      default:      return true;
    }
  };

  // ====== 2) РЕНДЕР ======
  function renderTop(grid, arr){
    grid.innerHTML = arr.map(u=>{
      const photo = hasPhoto(u)
        ? `<img src="${u.picture_large}" alt="${u.full_name}">`
        : `<div class="circle">${initials(u.full_name)}</div>`;
      const fav = u.favorite ? '★' : '☆';
      return `
        <div class="teacher-card" data-id="${u.id}" style="position:relative">
          <a href="#" class="open-ti" style="display:block">${photo}<b>${u.full_name}</b><small>${u.country}</small></a>
          <button class="fav-btn" title="Toggle favorite" style="position:absolute;right:4px;top:4px;border:none;background:transparent;font-size:18px;cursor:pointer">${fav}</button>
        </div>`;
    }).join('');
  }

  function renderFavorites(track, arr){
    const favs = arr.filter(u=>u.favorite);
    track.innerHTML = favs.length ? favs.map(u=>{
      const photo = hasPhoto(u)
        ? `<img src="${u.picture_large}" alt="${u.full_name}">`
        : `<div class="circle">${initials(u.full_name)}</div>`;
      return `<a href="#" class="fav-card" data-id="${u.id}">${photo}<b>${u.full_name}</b><small>${u.country}</small></a>`;
    }).join('') : `<div style="padding:12px;color:#777">No favorites yet</div>`;
  }

  function renderStats(tbody, arr){
    tbody.innerHTML = arr.map(u=>{
      const age = computeAge(u) ?? u.age ?? '—';
      const g = u.gender ? u.gender[0].toUpperCase()+u.gender.slice(1) : '—';
      return `
        <tr>
          <td>${u.full_name}</td>
          <td>${u.speciality||'—'}</td>
          <td>${age}</td>
          <td>${g}</td>
          <td>${u.country}</td>
        </tr>
      `;
    }).join('');
  }

  // модалка info (одна динамическая)
  function ensureInfoModal(){
    if (document.getElementById('ti-dynamic')) return;
    const modal = document.createElement('div');
    modal.className = 'popup modal';
    modal.id = 'ti-dynamic';
    modal.innerHTML = `
      <div class="popup-content ti-card">
        <a href="#" class="close">✖</a>
        <div class="ti-head">teacher info</div>
        <div class="ti-body">
          <img class="ti-photo" alt="">
          <div>
            <div class="ti-name"><span class="ti-n"></span> <span class="ti-star" style="display:none">★</span></div>
            <div class="ti-spec"></div>
            <div class="ti-meta"></div>
            <div class="ti-contact"></div>
            <p class="ti-desc"></p>
          </div>
        </div>
      </div>`;
    document.body.appendChild(modal);
  }
  function openInfo(u){
    ensureInfoModal();
    const m = document.getElementById('ti-dynamic');
    m.style.display = 'flex';
    const img = m.querySelector('.ti-photo');
    if (hasPhoto(u)) { img.src = u.picture_large; img.style.display='block'; }
    else { img.removeAttribute('src'); img.style.display='none'; }

    m.querySelector('.ti-n').textContent = u.full_name;
    m.querySelector('.ti-star').style.display = u.favorite ? 'inline' : 'none';
    m.querySelector('.ti-spec').textContent = u.speciality || '—';
    const g = u.gender ? u.gender[0].toUpperCase()+u.gender.slice(1) : '—';
    m.querySelector('.ti-meta').textContent = `${u.city?u.city+', ':''}${u.country} · ${g}`;
    m.querySelector('.ti-contact').innerHTML = `
      ${u.email?`<p><a href="mailto:${u.email}">${u.email}</a></p>`:''}
      ${u.phone?`<p>${u.phone}</p>`:''}
    `;
    m.querySelector('.ti-desc').textContent = u.note || '—';
    m.querySelector('.close').onclick = (e)=>{ e.preventDefault(); m.style.display='none'; location.hash='#'; };
  }

  
  function initTeacherfinder(){
    // DOM cache
    const grid = document.querySelector('.top-teachers');
    const favTrack = document.querySelector('.favorites-section .track');
    const statsTbody = document.querySelector('.stats tbody');
    const countrySel = document.querySelector('#region');
    const ageSel     = document.querySelector('#age');
    const genderSel  = document.querySelector('#Gender');
    const onlyFavChk   = document.querySelector('#onlyFav');
    const onlyPhotoChk = document.querySelector('#onlyPhoto');
    const searchForm = document.querySelector('.searchbar');
    const searchInput = searchForm?.querySelector('input');
    const addForm    = document.querySelector('.add-form');
    const addPopupCheckbox = document.querySelector('#openAdd');

    
    const data = [...(window.random_user_mock || fallbackRandomUsers), ...(window.additional_users || fallbackAdditional)]
      .map((u, i) => ({
        id: u.id ?? ('t'+(i+1)),
        full_name: u.full_name?.trim() || 'Unknown',
        gender: normalize(u.gender),
        country: u.country || '—',
        city: u.city || '',
        speciality: u.speciality || u.course || '',
        age: Number(u.age)||0,
        email: u.email || '',
        phone: u.phone || '',
        b_date: u.b_date || '',
        picture_large: u.picture_large || '',
        note: u.note || '',
        favorite: !!u.favorite,
        bg_color: u.bg_color || ''
      }));

    
    const countries = Array.from(new Set(data.map(u => u.country))).sort((a,b)=>a.localeCompare(b));
    if (countrySel) {
      countrySel.innerHTML = `<option value="">Any</option>` + countries.map(c=>`<option>${c}</option>`).join('');
    }
   
    if (ageSel && !ageSel.querySelector('option[value=""]')) {
      ageSel.insertAdjacentHTML('afterbegin', '<option value="" selected>Any</option>');
    }

    
    let searchQuery = '';
    function searchMatches(u, q){
      const raw = (q||'').trim().toLowerCase();
      if (!raw) return true;
      const mAgeEq = raw.match(/^age\s*:\s*(\d+)$/);
      const mAgeRange = raw.match(/^age\s*:\s*(\d+)\s*-\s*(\d+)$/);
      const mNote = raw.match(/^note\s*:\s*(.+)$/);
      const mName = raw.match(/^name\s*:\s*(.+)$/);

      const ua = computeAge(u) ?? u.age;
      if (mAgeEq)  return ua === Number(mAgeEq[1]);
      if (mAgeRange){
        const a = Number(mAgeRange[1]), b = Number(mAgeRange[2]);
        return ua >= Math.min(a,b) && ua <= Math.max(a,b);
      }
      if (mNote)  return String(u.note||'').toLowerCase().includes(mNote[1].trim());
      if (mName)  return String(u.full_name||'').toLowerCase().includes(mName[1].trim());
      if (/^\d+$/.test(raw)) return String(ua) === raw;
      const nameHit = String(u.full_name||'').toLowerCase().includes(raw);
      const noteHit = String(u.note||'').toLowerCase().includes(raw);
      return nameHit || noteHit;
    }

    // сортировка
    let sortKey = null; // 'full_name'|'speciality'|'country'|'age'
    let sortDir = 1;
    function applySort(arr){
      if(!sortKey) return arr;
      const k = sortKey, d = sortDir;
      return [...arr].sort((a,b)=>{
        if (k==='age'){
          const av = computeAge(a) ?? a.age ?? 0;
          const bv = computeAge(b) ?? b.age ?? 0;
          return (av - bv) * d;
        }
        const av = String(a[k] ?? '').toLowerCase();
        const bv = String(b[k] ?? '').toLowerCase();
        return av < bv ? -1*d : av > bv ? 1*d : 0;
      });
    }

    // фильтры
    function applyFilters(arr){
      const country = countrySel?.value.trim();
      const ageOpt  = ageSel?.value.trim();
      const gender  = normalize(genderSel?.value || '');
      const onlyFav = !!onlyFavChk?.checked;
      const onlyPhoto = !!onlyPhotoChk?.checked;

      return arr.filter(u=>{
        if (country && u.country !== country) return false;
        if (gender && gender!=='any' && u.gender !== gender) return false;
        const a = computeAge(u) ?? u.age;
        if (!inAgeRange(a, ageOpt)) return false;
        if (onlyFav && !u.favorite) return false;
        if (onlyPhoto && !hasPhoto(u)) return false;
        return searchMatches(u, searchQuery);
      });
    }

    // общая перерисовка
    function updateAll(){
      const filtered = applyFilters(data);
      const ordered = applySort(filtered);
      if (grid) renderTop(grid, ordered);
      if (favTrack) renderFavorites(favTrack, data);
      if (statsTbody) renderStats(statsTbody, ordered);
    }

    // события
    [countrySel, ageSel, genderSel, onlyFavChk, onlyPhotoChk]
      .forEach(el => el && el.addEventListener('change', updateAll));

    searchForm?.addEventListener('submit', (e)=>{
      e.preventDefault();
      searchQuery = (searchInput?.value||'').trim();
      updateAll();
    });

    // клики по карточкам и избранному
    grid?.addEventListener('click', (e)=>{
      const card = e.target.closest('.teacher-card');
      if (!card) return;
      const user = data.find(x=>x.id===card.dataset.id);
      if (!user) return;
      if (e.target.closest('.fav-btn')) {
        user.favorite = !user.favorite;
        updateAll();
        e.preventDefault();
        return;
      }
      if (e.target.closest('.open-ti')) {
        e.preventDefault();
        openInfo(user);
      }
    });
    favTrack?.addEventListener('click', (e)=>{
      const a = e.target.closest('.fav-card');
      if (!a) return;
      e.preventDefault();
      const user = data.find(x=>x.id===a.dataset.id);
      if (user) openInfo(user);
    });

    // сортирание в таблице
    const thMap = { 'Name':'full_name', 'Speciality':'speciality', 'Age':'age', 'Nationality':'country' };
    document.querySelectorAll('.stats thead th').forEach(th=>{
      th.style.cursor = 'pointer';
      th.title = 'Click to sort';
      th.addEventListener('click', ()=>{
        const key = thMap[th.textContent.trim()];
        if (!key) return;
        if (sortKey === key) sortDir *= -1; else { sortKey = key; sortDir = 1; }
        updateAll();
      });
    });

   
    if (addForm){
      const btn = addForm.querySelector('.btn-primary'); // у тебя label — ок
      btn?.addEventListener('click', (e)=>{
        e.preventDefault();
        const fd = new FormData(addForm);
        const gender = (fd.getAll('Gender')[0]||'').toString().toLowerCase();
        const obj = {
          id: 't' + (data.length+1),
          full_name: (addForm.querySelector('input[placeholder="Enter name"]')?.value||'').trim() || 'New Teacher',
          speciality: addForm.querySelector('select')?.value || '',
          country: addForm.querySelector('select:nth-of-type(2)')?.value || '—',
          city: addForm.querySelector('input[placeholder="City"]')?.value || '',
          email: addForm.querySelector('input[type="email"]')?.value || '',
          phone: addForm.querySelector('input[type="tel"]')?.value || '',
          b_date: addForm.querySelector('input[type="date"]')?.value || '',
          bg_color: addForm.querySelector('input[type="color"]')?.value || '',
          note: addForm.querySelector('textarea')?.value || '',
          gender,
          picture_large: '',
          favorite: false
        };
        const ageCalc = computeAge(obj);
        if (isNumber(ageCalc)) obj.age = ageCalc;

        data.push(obj);
        updateAll();

        // закрыть попап (checkbox) и очистить форму
        const cb = document.getElementById('openAdd');
        if (cb) cb.checked = false;
        addForm.reset();
      });
    }
    // клик по фону попапа + Esc закрывают
    document.getElementById('addPopup')?.addEventListener('click', (e) => {
      if (e.target.id === 'addPopup') {
        const cb = document.getElementById('openAdd');
        if (cb) cb.checked = false;
      }
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const cb = document.getElementById('openAdd');
        if (cb) cb.checked = false;
      }
    });

    // стартовая отрисовка
    updateAll();
  }

  // ====== EXPORT ======
  window.App = window.App || {};
  Object.assign(window.App, {
    initTeacherfinder
  });
})();
})();
