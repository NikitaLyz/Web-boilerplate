
(function () {
  const Core = window.Core || window.App;


  const hasPhoto = (u) => !!u.picture_large;
  const initials = (name) =>
    name.split(/\s+/).map(s => s[0]?.toUpperCase() || '').slice(0,2).join('.') || 'N/A';

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
      return `<tr>
        <td>${u.full_name}</td>
        <td>${u.speciality||'—'}</td>
        <td>${age}</td>
        <td>${g}</td>
        <td>${u.country}</td>
      </tr>`;
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

  function initTeacherfinder(){
  
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

    const data = Core.prepareUsers(
      window.random_user_mock || [],
      window.additional_users || []
    );

  
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
      return String(u.full_name||'').toLowerCase().includes(raw) ||
             String(u.note||'').toLowerCase().includes(raw);
    }

    
    let sortKey = null;
    let sortDir = 1;
    const applySort = (arr) =>
      sortKey ? Core.sortUsers(arr, sortKey, sortDir===1?'asc':'desc') : arr;

    
    function applyFilters(arr){
      const country = countrySel?.value.trim();
      const ageOpt  = ageSel?.value.trim();
      const gender  = Core.normalize(genderSel?.value || '');
      const onlyFav = !!onlyFavChk?.checked;
      const onlyPhoto = !!onlyPhotoChk?.checked;

      let ageMin, ageMax;
      if (ageOpt==='18-31'){ ageMin=18; ageMax=31; }
      else if (ageOpt==='32-45'){ ageMin=32; ageMax=45; }
      else if (ageOpt==='46-60'){ ageMin=46; ageMax=60; }
      else if (ageOpt==='60+'){ ageMin=60; }

      const coreFiltered = Core.filterUsers(arr, {
        country: country || undefined,
        gender: gender==='any' ? undefined : gender,
        favorite: onlyFav || undefined,
        photo: onlyPhoto || undefined,
        ageMin, ageMax
      });

      return coreFiltered.filter(u => searchMatches(u, searchQuery));
    }

    function updateAll(){
      const filtered = applyFilters(data);
      const ordered = applySort(filtered);
      if (grid) renderTop(grid, ordered);
      if (favTrack) renderFavorites(favTrack, data);
      if (statsTbody) renderStats(statsTbody, ordered);
    }

   
    [countrySel, ageSel, genderSel, onlyFavChk, onlyPhotoChk]
      .forEach(el => el && el.addEventListener('change', updateAll));

    searchForm?.addEventListener('submit', (e)=>{
      e.preventDefault();
      searchQuery = (searchInput?.value||'').trim();
      updateAll();
    });

   
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

      addBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        const fd = new FormData(addFormEl);
        const rawGender = (fd.getAll('Gender')[0] || '').toString();
        const isoDate = normalizeDate(addFormEl.querySelector('input[type="date"]')?.value || '');

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
          bg_color: addFormEl.querySelector('input[type="color"]')?.value || (Core?.randPastelHex ? Core.randPastelHex() : '#dddddd'),
          note: addFormEl.querySelector('textarea')?.value || '',
          gender: rawGender,
          picture_large: '',
          favorite: false
        };

        data.push(newTeacher);
        updateAll();

        const cb = document.getElementById('openAdd');
        if (cb) cb.checked = false;
        addFormEl.reset();
      });
    }

 
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

    updateAll();
  }

  window.App = window.App || {};
  Object.assign(window.App, { initTeacherfinder });
})();
