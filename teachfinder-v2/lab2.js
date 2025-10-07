
(function () {
  const Core = window.Core || window.App;
const API_URL = 'http://localhost:3000/teachers';
const SPECIALITIES = ['Math','Chemistry','Physics','Biology','English','Art','PE','Statistics','Computer Science','History','Geography'];

async function saveTeacherToServer(teacher){
  try{
    const resp = await fetch(API_URL, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(teacher)
    });
    if(!resp.ok) throw new Error(`POST ${resp.status}`);
    const created = await resp.json();
    console.log('✅ Збережено на json-server:', created);
    return { ok:true, data: created };
  }catch(err){
    console.error('❌ Помилка POST на json-server:', err);
    return { ok:false, error: err };
  }
}
 
  const state = { users: [], seed: null, page: 1 };
// ==== Lodash helpers ====

// Нормалізація рядків
const cap = (s) => _.isString(s) ? _.startCase(_.toLower(s)) : s;
const normGender = (g) => {
  const v = _.toLower(String(g||''));
  if (v.startsWith('m')) return 'Male';
  if (v.startsWith('f')) return 'Female';
  return 'Unknown';
};

// 2.1 Мапінг randomuser -> наш формат (через lodash)
function mapRandomUserLodash(u){
  const id = _.get(u, 'login.uuid') || (Core?.genId ? Core.genId() : ('id-' + Math.random().toString(36).slice(2)));
  const first = _.get(u,'name.first','');
  const last  = _.get(u,'name.last','');
  const full_name = _.trim([first,last].join(' '));
  const country = _.get(u,'location.country','—');
  const city    = _.get(u,'location.city','');
  const email   = _.get(u,'email','');
  const phone   = _.get(u,'phone') || _.get(u,'cell','');
  const b_date  = _.get(u,'dob.date','');
  const age     = _.toNumber(_.get(u,'dob.age'));
  const gender  = normGender(_.get(u,'gender',''));
  const picture_large = _.get(u,'picture.large','');
const speciality = SPECIALITIES[_.random(0, SPECIALITIES.length - 1)];

  return {
  
   id, full_name,
  speciality,
    country, city, email, phone,
    b_date, age, gender,
    note: '',
    bg_color: Core?.randPastelHex?.() || '#ddd',
    picture_large,
    favorite: false,
    coordinates: {
      latitude:  String(_.get(u,'location.coordinates.latitude','')),
      longitude: String(_.get(u,'location.coordinates.longitude',''))
    },
    timezone: {
      offset: _.get(u,'location.timezone.offset',''),
      description: _.get(u,'location.timezone.description','')
    }
  };
}

// 2.2 Валідація "додаваного" викладача
function validateTeacher(t){
  const errors = [];

  if (_.isEmpty(_.trim(t.full_name||''))) errors.push('Name is required.');
  if (_.isEmpty(_.trim(t.country||'')))   errors.push('Country is required.');

  if (t.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t.email)) errors.push('Email is invalid.');
  if (t.phone && !/^[\d+\-\s()]{6,}$/.test(t.phone)) errors.push('Phone looks invalid.');

  // узгодженість віку
  if (t.b_date){
    const d = new Date(t.b_date);
    if (!Number.isFinite(+d)) errors.push('Birth date is invalid.');
  }
  if (t.age != null && (!Number.isFinite(+t.age) || +t.age < 0 || +t.age > 120))
    errors.push('Age is invalid.');

  return { ok: errors.length === 0, errors };
}

// 2.3 Сортування
function sortUsersLodash(arr, key, dir){
  // dir: 'asc' | 'desc'
  return _.orderBy(arr, [key], [dir]);
}

// 2.4 Фільтрація
function filterUsersLodash(arr, {region, gender, favorite, photo, ageMin, ageMax} = {}){
  return _.filter(arr, u => {
    // region тут у тебе — країна; якщо хочеш інший мапінг — заміни
    if (region && u.country !== region) return false;

    if (gender && _.toLower(gender) !== 'any') {
      const ug = _.toLower(u.gender||'');
      if (!ug || ug !== _.toLower(gender)) return false;
    }
    if (favorite && !u.favorite) return false;
    if (photo && !u.picture_large) return false;

    const a = _.isNumber(u.age) ? u.age : undefined;
    if (ageMin != null && a != null && a < ageMin) return false;
    if (ageMax != null && a != null && a > ageMax) return false;

    return true;
  });
}

// 2.5 Пошук (name / note / age та спеціальні префікси)
function searchMatchesLodash(u, q){
  const raw = _.toLower(_.trim(q||''));
  if (!raw) return true;

  const ua = _.isNumber(u.age) ? u.age : undefined;

  const mAgeEq    = raw.match(/^age\s*:\s*(\d+)$/);
  const mAgeRange = raw.match(/^age\s*:\s*(\d+)\s*-\s*(\d+)$/);
  const mNote     = raw.match(/^note\s*:\s*(.+)$/);
  const mName     = raw.match(/^name\s*:\s*(.+)$/);

  if (mAgeEq)     return ua === Number(mAgeEq[1]);
  if (mAgeRange)  { const a = +mAgeRange[1], b = +mAgeRange[2]; return ua >= Math.min(a,b) && ua <= Math.max(a,b); }
  if (mNote)      return _.includes(_.toLower(u.note||''), _.toLower(mNote[1].trim()));
  if (mName)      return _.includes(_.toLower(u.full_name||''), _.toLower(mName[1].trim()));
  if (/^\d+$/.test(raw)) return String(ua||'') === raw;

  return _.includes(_.toLower(u.full_name||''), raw) || _.includes(_.toLower(u.note||''), raw);
}


async function fetchUsers({ results = 50, page = 1, seed = null } = {}) {
  const usedSeed = seed || state.seed || Math.random().toString(36).slice(2);
  if (!state.seed) state.seed = usedSeed;

  const url = `https://randomuser.me/api/?results=${results}&page=${page}&seed=${usedSeed}&nat=us,gb,ua,fr,de,nl,dk,ie,au,ca`;

  const resp = await fetch(url);         
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const json = await resp.json();
const SPECIALITIES = ['Math','Chemistry','Physics','Biology','English','Art','PE','Statistics','Computer Science','History','Geography'];

const mapRandomUserFallback = (u) => ({
  id: u.login?.uuid || (Core?.genId ? Core.genId() : ('id-' + Math.random().toString(36).slice(2))),
  full_name: `${u.name?.first ?? ''} ${u.name?.last ?? ''}`.trim(),
  speciality: SPECIALITIES[Math.floor(Math.random() * SPECIALITIES.length)],
  country: u.location?.country ?? '—',
  city: u.location?.city ?? '',
  email: u.email ?? '',
  phone: u.phone || u.cell || '',
  b_date: u.dob?.date || '',
  age: u.dob?.age,
  gender: u.gender ?? '',
  note: '',
  bg_color: Core?.randPastelHex?.() || '#ddd',
  picture_large: u.picture?.large || '',
  favorite: false,

  // ⬇⬇⬇ додали це
  coordinates: {
    latitude:  String(u.location?.coordinates?.latitude ?? ''),
    longitude: String(u.location?.coordinates?.longitude ?? '')
  },
  timezone: {
    offset:      u.location?.timezone?.offset ?? '',
    description: u.location?.timezone?.description ?? ''
  }
});
 const mapper = mapRandomUserLodash; // тепер через lodash
return (json.results || []).map(mapper);
} // ← закриваємо fetchU


  const hasPhoto = (u) => !!u.picture_large;
  const initials = (name) =>
    String(name || '')
      .trim()
      .split(/\s+/)
      .map(s => s[0]?.toUpperCase() || '')
      .slice(0, 2)
      .join('.') || 'N/A';

  const computeAge = (u) => {
    if (typeof u.age === 'number' && u.age > 0) return u.age;
    if (!u.b_date) return undefined;
    const d = new Date(u.b_date);
    if (Number.isNaN(+d)) return undefined;
    const now = new Date();
    let a = now.getFullYear() - d.getFullYear();
    const m = now.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < d.getDate())) a--;
    return a;
  };
async function loadLocalTeachers() {
  try {
    const resp = await fetch(API_URL);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    // json-server может вернуть либо массив, либо объект с полем teachers
    return Array.isArray(data) ? data : (data.teachers || []);
  } catch (e) {
    console.error('GET /teachers failed', e);
    return [];
  }
}


  function renderTop(grid, arr){
    grid.innerHTML = arr.map(u=>{
      const photo = hasPhoto(u)
        ? `<img src="${u.picture_large}" alt="${u.full_name}">`
        : `<div class="circle">${initials(u.full_name)}</div>`;
      const fav = u.favorite ? '★' : '☆';
      return `
        <div class="teacher-card" data-id="${u.id}" style="position:relative">
          <a href="#" class="open-ti" style="display:block">
            ${photo}
            <div class="teacher-text">
              <b class="teacher-name">${u.full_name}</b>
              <small class="teacher-country">${u.country}</small>
            </div>
          </a>
          <button class="fav-btn" title="Toggle favorite"
            style="position:absolute;right:4px;top:4px;border:none;background:transparent;font-size:18px;cursor:pointer">${fav}</button>
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
      return `<tr><td>${u.full_name}</td><td>${u.speciality||'—'}</td><td>${age}</td><td>${g}</td><td>${u.country}</td></tr>`;
    }).join('');
  }
 
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
           <div class="ti-birthday" style="color:#666;margin:6px 0">—</div>

          <div class="ti-map" style="height:220px; margin-top:10px; border-radius:6px;"></div>
        </div>
      </div>
    </div>`;
  document.body.appendChild(modal);
}
// ==== Chart.js helpers ====
let statsChart = null;
function daysToNextBirthday(dateStr){
  if (!dateStr || !window.dayjs) return null;
  const d = dayjs(dateStr);
  if (!d.isValid()) return null;
  const now = dayjs();
  let next = d.year(now.year());
  if (next.isBefore(now, 'day')) next = next.add(1, 'year');
  return next.startOf('day').diff(now.startOf('day'), 'day');
}
function buildStatsData(arr) {
  // рахуємо розподіл за спеціальністю
  const bySpec = {};
  for (const u of arr) {
    const k = (u.speciality || '—').trim();
    bySpec[k] = (bySpec[k] || 0) + 1;
  }
  const labels = Object.keys(bySpec);
  const values = labels.map(k => bySpec[k]);
  return { labels, values };
}

function renderPieChart(arr){
  const el = document.getElementById('statsChart');
  if (!el || !window.Chart) return;

  const {labels, values} = buildStatsData(arr);

  if (statsChart) { statsChart.destroy(); statsChart = null; }
  statsChart = new Chart(el.getContext('2d'), {
    type: 'pie',
    data: {
      labels,
      datasets: [{ data: values }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'right' },
        title: { display: true, text: 'Distribution by Speciality' }
      }
    }
  });
}



function usersToRows(arr){
  return arr.map(u => ({
    "Name": u.full_name || '—',
    "Speciality": u.speciality || '—',
    "Age": (typeof u.age === 'number' ? u.age : (computeAge(u) ?? null)),
    "Gender": (u.gender ? (u.gender[0].toUpperCase()+u.gender.slice(1)) : '—'),
    "Country": u.country || '—',
    "City": u.city || '',
    "Email": u.email || '',
    "Phone": u.phone || '',
    "Favorite": !!u.favorite,
    "Birthday": (u.b_date || '').slice(0,10)
  }));
}

// === Pivot (WebDataRocks) ===




 function openInfo(u) {
  ensureInfoModal();
  const m = document.getElementById('ti-dynamic');
  m.style.display = 'flex';

  // фото
  const img = m.querySelector('.ti-photo');
  if (hasPhoto(u)) {
    img.src = u.picture_large;
    img.style.display = 'block';
  } else {
    img.removeAttribute('src');
    img.style.display = 'none';
  }

  // базова інфа
  m.querySelector('.ti-n').textContent = u.full_name || '—';
  m.querySelector('.ti-star').style.display = u.favorite ? 'inline' : 'none';
  m.querySelector('.ti-spec').textContent = u.speciality || '—';
  const g = u.gender ? u.gender[0].toUpperCase() + u.gender.slice(1) : '—';
  m.querySelector('.ti-meta').textContent = `${u.city ? u.city + ', ' : ''}${u.country || '—'} · ${g}`;
  m.querySelector('.ti-contact').innerHTML = `
    ${u.email ? `<p><a href="mailto:${u.email}">${u.email}</a></p>` : ''}
    ${u.phone ? `<p>${u.phone}</p>` : ''}`;
  m.querySelector('.ti-desc').textContent = u.note || '—';

  // (опционально) скільки днів до наступного ДН — якщо на картці є <div class="ti-birthday"></div>
const birthBox = m.querySelector('.ti-birthday')
if (birthBox && window.dayjs) {
  const raw = u.b_date || u.dob?.date || '';
  const left = daysToNextBirthday(raw);
  birthBox.textContent = (left == null) ? '—' : `До наступного дня народження: ${left} дн.`;
}

  // MAP BLOCK (Leaflet) — створюємо один раз і пере-використовуємо
  const mapContainer = m.querySelector('.ti-map');
  if (mapContainer && window.L) {
    // координати з різних можливих місць
    const latRaw = u?.coordinates?.latitude
                ?? u?.coord?.lat
                ?? u?.location?.coordinates?.latitude
                ?? 0;
    const lonRaw = u?.coordinates?.longitude
                ?? u?.coord?.lon
                ?? u?.location?.coordinates?.longitude
                ?? 0;

    const lat = parseFloat(latRaw);
    const lon = parseFloat(lonRaw);
    const hasCoords = Number.isFinite(lat) && Number.isFinite(lon);
    const center = hasCoords ? [lat, lon] : [0, 0];
    const zoom = hasCoords ? 10 : 1;

    if (mapContainer.__leafletMap) {
      // оновлюємо існуючу карту/маркер
      const map = mapContainer.__leafletMap;
      map.setView(center, zoom);

      if (mapContainer.__leafletMarker) {
        mapContainer.__leafletMarker
          .setLatLng(center)
          .bindPopup(`${u.full_name}<br>${u.city ? u.city + ', ' : ''}${u.country || ''}`);
      } else if (hasCoords) {
        mapContainer.__leafletMarker = L.marker(center).addTo(map)
          .bindPopup(`${u.full_name}<br>${u.city ? u.city + ', ' : ''}${u.country || ''}`);
      }
      // пересчитать размеры после показа модалки
      setTimeout(() => map.invalidateSize(), 0);
    } else {
      // створюємо карту вперше
      const map = L.map(mapContainer).setView(center, zoom);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      if (hasCoords) {
        mapContainer.__leafletMarker = L.marker(center).addTo(map)
          .bindPopup(`${u.full_name}<br>${u.city ? u.city + ', ' : ''}${u.country || ''}`);
      }
      mapContainer.__leafletMap = map;
      setTimeout(() => map.invalidateSize(), 0);
    }
  }

  // закриття модалки
  m.querySelector('.close').onclick = (e) => {
    e.preventDefault();
    m.style.display = 'none';
    location.hash = '#';
  };
}
// ====== основной инициализатор ======
async function initTeacherfinder() {
  // DOM
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
  const addFormEl  = document.querySelector('.add-form');
  const loadMoreBtn = document.getElementById('loadMore');

  // 1) первичная загрузка
  try {
    const [localTeachers, randomUsers] = await Promise.all([
      loadLocalTeachers(),
      fetchUsers({ results: 50, page: 1 })
    ]);
    state.users = [...localTeachers, ...randomUsers];
    state.page = 1;
  } catch (e) {
    console.error(e);
    state.users = [];
  }

  // 4) Уніфікуємо списки / сортування / фільтри / пошук

  // 📌 Страны для фильтра (через lodash)
  const countries = _.sortBy(_.uniq(_.compact(state.users.map(u => u.country))));
  if (countrySel) {
    countrySel.innerHTML = `<option value="">Any</option>` +
      countries.map(c => `<option>${_.escape(c)}</option>`).join('');
  }
  if (ageSel && !ageSel.querySelector('option[value=""]')) {
    ageSel.insertAdjacentHTML('afterbegin', '<option value="" selected>Any</option>');
  }

  // 📌 Сортування — через lodash
  let sortKey = null, sortDir = 1;
  const applySort = (arr) => sortKey
    ? sortUsersLodash(arr, sortKey, (sortDir === 1 ? 'asc' : 'desc'))
    : arr;

  // 📌 Пошук
  let searchQuery = '';

  // 📌 Фільтрація — через lodash
  function applyFilters(arr) {
    const ageOpt  = ageSel?.value.trim();
   const normalize = Core?.normalize ?? (s => String(s||'').trim().toLowerCase());
const gender = normalize(genderSel?.value || '');

    const onlyFav = !!onlyFavChk?.checked;
    const onlyPhoto = !!onlyPhotoChk?.checked;

    let ageMin, ageMax;
    if (ageOpt === '18-31') { ageMin = 18; ageMax = 31; }
    else if (ageOpt === '32-45') { ageMin = 32; ageMax = 45; }
    else if (ageOpt === '46-60') { ageMin = 46; ageMax = 60; }
    else if (ageOpt === '60+') { ageMin = 60; }

    const region = document.querySelector('#region')?.value || '';

    const coreFiltered = filterUsersLodash(arr, {
      region: region || undefined,
      gender: gender === 'any' ? undefined : gender,
      favorite: onlyFav || undefined,
      photo: onlyPhoto || undefined,
      ageMin, ageMax
    });

    return coreFiltered.filter(u => searchMatchesLodash(u, searchQuery));
  }
// === Pivot (WebDataRocks) ===
let wdr = null;
let pivotMode = 'countries';

function ensurePivot(initialData){
  if (wdr || !window.WebDataRocks) return;
  wdr = new WebDataRocks({
    container: "#pivot-container",
    height: 430,
    toolbar: true,
    report: {
      dataSource: { data: initialData || [] },
      options: { grid: { type: "classic" } }
    }
  });
}

function applyPivotMode(mode, dataRows){
  pivotMode = mode;
  if (!wdr) return;
  if (mode === 'countries'){
    wdr.setReport({
      dataSource: { data: dataRows },
      options: { grid: { type: "classic" } },
      slice: {
        rows: [{ uniqueName: "Country" }],
        measures: [
          { uniqueName: "Name", aggregation: "count", caption: "Teachers" },
          { uniqueName: "Age",  aggregation: "average", caption: "Avg age" }
        ]
      }
    });
  } else {
    wdr.setReport({
      dataSource: { data: dataRows },
      options: { grid: { type: "flat" } }
    });
  }
}

function togglePivotVisibility(show){
  const wrapper = document.getElementById('pivot-container');
  const table = document.querySelector('.stats');
  const canvas = document.getElementById('statsChart');
  if (!wrapper) return;

  if (show){
    if (table) table.style.display = 'none';
    if (canvas){
      canvas.style.display = 'none';
      if (statsChart){ statsChart.destroy(); statsChart = null; }
    }
    wrapper.style.display = '';

    const filtered = applyFilters(state.users);
    const ordered  = applySort(filtered);
    const rows     = usersToRows(ordered);

    ensurePivot(rows);
    applyPivotMode('countries', rows);

    const btn = document.getElementById('showPivot');
    if (btn) btn.textContent = 'Hide country report';
  } else {
    wrapper.style.display = 'none';
    document.querySelector('.stats')?.style.removeProperty('display');
    const btn = document.getElementById('showPivot');
    if (btn) btn.textContent = 'Show country report';
  }
}

function refreshPivotIfVisible(){
  const wrapper = document.getElementById('pivot-container');
  if (!wrapper || wrapper.style.display === 'none' || !wdr) return;
  const filtered = applyFilters(state.users);
  const ordered  = applySort(filtered);
  const rows     = usersToRows(ordered);
  applyPivotMode(pivotMode, rows);
}

  // 📌 Обновление UI
  function updateAll() {
    const filtered = applyFilters(state.users);
    const ordered = applySort(filtered);
    if (grid) renderTop(grid, ordered);
    if (favTrack) renderFavorites(favTrack, state.users);
    if (statsTbody) renderStats(statsTbody, ordered);

    // если включена диаграмма — перерисовать
    const statsCanvas = document.getElementById('statsChart');
if (statsCanvas && getComputedStyle(statsCanvas).display !== 'none') {
  renderPieChart(ordered);
  
    }
    refreshPivotIfVisible();
  }

  // 📌 Слушатели фильтров и поиска
  ;[countrySel, ageSel, genderSel, onlyFavChk, onlyPhotoChk]
    .forEach(el => el && el.addEventListener('change', updateAll));

  searchForm?.addEventListener('submit', (e)=>{
    e.preventDefault();
    searchQuery = (searchInput?.value||'').trim();
    updateAll();
  });

  // 📌 Переключатель таблица / диаграмма
  document.getElementById('toggleStatsView')?.addEventListener('click', ()=>{
    const table = document.querySelector('.stats');
    const canvas = document.getElementById('statsChart');
    if (!table || !canvas) return;

    const tableVisible = getComputedStyle(table).display !== 'none';
    table.style.display = tableVisible ? 'none' : '';
    canvas.style.display = tableVisible ? '' : 'none';

    if (!tableVisible) {
      if (statsChart) {
        statsChart.destroy();
        statsChart = null;
      }
    } else {
      const filtered = applyFilters(state.users);
      const ordered = applySort(filtered);
      renderPieChart(ordered);
    }
  });
document.getElementById('showPivot')?.addEventListener('click', ()=>{
  const el = document.getElementById('pivot-container');
  const show = !el || el.style.display === 'none';
  togglePivotVisibility(show);
});

  // 📌 Клик по карточкам
  grid?.addEventListener('click', (e)=>{
    const card = e.target.closest('.teacher-card');
    if (!card) return;
    const user = state.users.find(x=>x.id===card.dataset.id);
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

  // 📌 Клик по фаворитам
  favTrack?.addEventListener('click', (e)=>{
    const a = e.target.closest('.fav-card');
    if (!a) return;
    e.preventDefault();
    const user = state.users.find(x=>x.id===a.dataset.id);
    if (user) openInfo(user);
  });

  // 📌 Сортировка таблицы по заголовкам
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

  // 📌 Пагинация — «Next 10»
  loadMoreBtn?.addEventListener('click', async () => {
    try {
      const nextPage = state.page + 1;
      const more = await fetchUsers({ results: 10, page: nextPage, seed: state.seed });
      state.users.push(...more);
      state.page = nextPage;
      updateAll();
    } catch (err) {
      console.error(err);
      alert('Не удалось загрузить следующую страницу');
    }
  });

  // 📌 Закрытие попапа по клику и Esc
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
// переключатель "таблица/пивот"



  
  updateAll();
}

  // экспорт
  window.App = window.App || {};
  Object.assign(window.App, { initTeacherfinder });
})();
