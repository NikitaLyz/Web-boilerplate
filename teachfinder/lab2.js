// lab2.js
(function () {
  const Core = window.Core || window.App;
const API_URL = 'http://localhost:3000/teachers';

// безопасное сохранение на сервер с логами ошибок
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
  // ====== состояние для API и списка ======
  const state = { users: [], seed: null, page: 1 };

  // ====== загрузка с randomuser.me ======
 // ====== загрузка с randomuser.me ======
async function fetchUsers({ results = 50, page = 1, seed = null } = {}) {
  const usedSeed = seed || state.seed || Math.random().toString(36).slice(2);
  if (!state.seed) state.seed = usedSeed;

  const url = `https://randomuser.me/api/?results=${results}&page=${page}&seed=${usedSeed}&nat=us,gb,ua,fr,de,nl,dk,ie,au,ca`;

  const resp = await fetch(url);           // <-- вот так
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const json = await resp.json();

  const mapRandomUserFallback = (u) => ({
    id: u.login?.uuid || (Core?.genId ? Core.genId() : ('id-' + Math.random().toString(36).slice(2))),
    full_name: `${u.name?.first ?? ''} ${u.name?.last ?? ''}`.trim(),
    speciality: 'Unknown',
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
    favorite: false
  });

  const mapper = Core?.mapRandomUser || mapRandomUserFallback;
  return (json.results || []).map(mapper);
}


  // ====== утилиты для DOM ======
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

  // ====== рендеры ======
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

  // (минимальная реализация инфо-попапа — если у тебя уже есть, можно оставить свой)
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
      ${u.phone?`<p>${u.phone}</p>`:''}`;
    m.querySelector('.ti-desc').textContent = u.note || '—';
    m.querySelector('.close').onclick = (e)=>{ e.preventDefault(); m.style.display='none'; location.hash='#'; };
  }

  // ====== основной инициализатор ======
  async function initTeacherfinder(){
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

    // 1) первичная загрузка 50
    try {
      state.users = await fetchUsers({ results: 50, page: 1 });
      state.page = 1;
    } catch (e) {
      console.error(e);
      state.users = []; // fallback
    }
try {
  const [localTeachers, randomUsers] = await Promise.all([
    loadLocalTeachers(),                     // ← с json-server
    fetchUsers({ results: 50, page: 1 })     // ← randomuser.me
  ]);
  state.users = [...localTeachers, ...randomUsers];
  state.page = 1;
} catch (e) {
  console.error(e);
  state.users = [];
}
    // 2) заполнить выпадашку стран из загруженных
    const countries = Array.from(new Set(state.users.map(u => u.country))).sort((a,b)=>a.localeCompare(b));
    if (countrySel) {
      countrySel.innerHTML = `<option value="">Any</option>` + countries.map(c=>`<option>${c}</option>`).join('');
    }
    if (ageSel && !ageSel.querySelector('option[value=""]')) {
      ageSel.insertAdjacentHTML('afterbegin', '<option value="" selected>Any</option>');
    }

    // 3) поиск по name/note/age
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
      return String(u.full_name||'').toLowerCase().includes(raw) ||
             String(u.note||'').toLowerCase().includes(raw);
    }

    // 4) сортировки/фильтры поверх state.users
    let sortKey = null, sortDir = 1;
    const applySort = (arr) => sortKey ? Core.sortUsers(arr, sortKey, sortDir===1?'asc':'desc') : arr;

    function applyFilters(arr){
      const ageOpt  = ageSel?.value.trim();
      const gender  = Core.normalize(genderSel?.value || '');
      const onlyFav = !!onlyFavChk?.checked;
      const onlyPhoto = !!onlyPhotoChk?.checked;

      let ageMin, ageMax;
      if (ageOpt==='18-31'){ ageMin=18; ageMax=31; }
      else if (ageOpt==='32-45'){ ageMin=32; ageMax=45; }
      else if (ageOpt==='46-60'){ ageMin=46; ageMax=60; }
      else if (ageOpt==='60+'){ ageMin=60; }

      // region-селект в твоём HTML на самом деле содержит регионы, а не страны,
      // поэтому используем его как «region» (Core.filterUsers умеет по REGIONS)
      const region = document.querySelector('#region')?.value || '';

      const coreFiltered = Core.filterUsers(arr, {
        region: region || undefined,
        gender: gender==='any' ? undefined : gender,
        favorite: onlyFav || undefined,
        photo: onlyPhoto || undefined,
        ageMin, ageMax
      });

      return coreFiltered.filter(u => searchMatches(u, searchQuery));
    }

    function updateAll(){
      const filtered = applyFilters(state.users);
      const ordered = applySort(filtered);
      if (grid) renderTop(grid, ordered);
      if (favTrack) renderFavorites(favTrack, state.users);
      if (statsTbody) renderStats(statsTbody, ordered);
    }

    // 5) события UI
    ;[countrySel, ageSel, genderSel, onlyFavChk, onlyPhotoChk]
      .forEach(el => el && el.addEventListener('change', updateAll));

    searchForm?.addEventListener('submit', (e)=>{
      e.preventDefault();
      searchQuery = (searchInput?.value||'').trim();
      updateAll();
    });

    // карточки/избранное
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
    favTrack?.addEventListener('click', (e)=>{
      const a = e.target.closest('.fav-card');
      if (!a) return;
      e.preventDefault();
      const user = state.users.find(x=>x.id===a.dataset.id);
      if (user) openInfo(user);
    });

    // клик по заголовкам таблицы — сортировка
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

    // 6) Add teacher (без validate, просто пушим)
    if (addFormEl) {
      const addBtn = addFormEl.querySelector('.btn-primary');
      const normalizeDate = (v) => {
        if (!v) return '';
        if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
        const m = v.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
        if (m) {
          const dd = m[1].padStart(2,'0');
          const mm = m[2].padStart(2,'0');
          const yyyy = m[3];
          return `${yyyy}-${mm}-${dd}`;
        }
        const d = new Date(v);
        if (!Number.isNaN(d.getTime())) {
          const yyyy = d.getFullYear();
          const mm = String(d.getMonth()+1).padStart(2,'0');
          const dd = String(d.getDate()).padStart(2,'0');
          return `${yyyy}-${mm}-${dd}`;
        }
        return v;
      };

     addBtn?.addEventListener('click', async (e) => {
  e.preventDefault();

  const fd = new FormData(addFormEl);
  const rawGender = (fd.getAll('Gender')[0] || '').toString();
  const isoDate = normalizeDate(addFormEl.querySelector('input[type="date"]')?.value || '');

  // собираем объект
  const newTeacher = {
    id: (Core?.genId ? Core.genId() : ('id-' + Math.random().toString(36).slice(2))),
    full_name: (addFormEl.querySelector('input[placeholder="Enter name"]')?.value || 'New Teacher').trim(),
    speciality: addFormEl.querySelector('select')?.value || '',
    country: addFormEl.querySelector('select:nth-of-type(2)')?.value || '—',
    city: addFormEl.querySelector('input[placeholder="City"]')?.value || '',
    email: addFormEl.querySelector('input[type="email"]')?.value || '',
    phone: addFormEl.querySelector('input[type="tel"]')?.value || '',
    b_date: isoDate,
    age: computeAge({ b_date: isoDate }),
    bg_color: addFormEl.querySelector('input[type="color"]')?.value || (Core?.randPastelHex ? Core.randPastelHex() : '#ddd'),
    note: addFormEl.querySelector('textarea')?.value || '',
    gender: rawGender,
    picture_large: '',
    favorite: false
  };

  // оптимистично кладём в UI
  state.users.push(newTeacher);
  updateAll();

  // пробуем сохранить на json-server
  const res = await saveTeacherToServer(newTeacher);

  // если сервер вернул id/изменения — синхронизируем локально (по email/временному id)
  if(res.ok && res.data){
    const i = state.users.findIndex(t => t.id === newTeacher.id);
    if(i !== -1){
      state.users[i] = { ...newTeacher, ...res.data }; // вдруг сервер подменил id
      updateAll();
    }
  }else{
    // мягко сообщаем об ошибке
    alert('Не вдалося зберегти на сервер. Запис залишився лише локально.');
  }

  // закрыть попап и очистить форму
  const cb = document.getElementById('openAdd'); if (cb) cb.checked = false;
  addFormEl.reset();
});
    
  } 
    // 7) пагинация — «Next 10»
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

    // закрытие попапа по клику на фон + Esc (если используешь checkbox-попап)
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

    // первый рендер
    updateAll();
  }

  // экспорт
  window.App = window.App || {};
  Object.assign(window.App, { initTeacherfinder });
})();
