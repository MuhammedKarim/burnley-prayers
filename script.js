function initPrayerTimes() {
  const prayersOrder = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];
  let allData = {};

  function formatTo12Hour(timeStr) {
    if (!timeStr) return '--';
    let [hour, minute] = timeStr.split(':').map(Number);
    hour = hour % 12;
    if (hour === 0) hour = 12;
    return `${hour}:${minute.toString().padStart(2, '0')}`;
  }

  function updateClock() {
    const now = new Date();
    let h = now.getHours();
    let m = now.getMinutes();
    h = h % 12;
    if (h === 0) h = 12;
    const formattedTime = `${h}:${m.toString().padStart(2, '0')}`;
  
    document.getElementById('current-time').textContent = formattedTime;
  
    const day = now.getDate();
    const weekday = now.toLocaleDateString('en-US', { weekday: 'long' });
    const month = now.toLocaleDateString('en-US', { month: 'long' });
  
    let suffix = 'th';
    if (day === 1 || day === 21 || day === 31) suffix = 'st';
    else if (day === 2 || day === 22) suffix = 'nd';
    else if (day === 3 || day === 23) suffix = 'rd';
  
    const formattedDate = `${weekday} ${day}${suffix} ${month}`;
    var nowH = umalqura();
    document.getElementById('current-date').textContent = formattedDate.toUpperCase();
    document.getElementById('arabic-date').textContent = nowH.format('d MMMM yyyy').toUpperCase() + ' AH';
  }
  
  function isJumuahPeriod(todayStr) {
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
  
    const today = new Date(todayStr);
    const day = today.getDay();
  
    const todayData = allData[todayStr];
  
    if (day === 4 && todayData?.dhuhr?.jamat) {
      const [h, m] = todayData.dhuhr.jamat.split(':').map(Number);
      return nowMinutes >= h * 60 + m + 5;
    }
  
    if (day === 5 && todayData?.dhuhr?.jamat) {
      const [h, m] = todayData.dhuhr.jamat.split(':').map(Number);
      return nowMinutes <= h * 60 + m + 5;
    }
  
    return false;
  }
  
  function getStartTime(prayer, today, tomorrow) {
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    const todayStart = allData[today]?.[prayer]?.start;
    const tomorrowStart = allData[tomorrow]?.[prayer]?.start;

    if (!todayStart) return formatTo12Hour(tomorrowStart) || '--';

    const [h, m] = todayStart.split(':').map(Number);
    const offset = prayer === 'sunrise' ? 15 : 5;
    const prayerMinutes = h * 60 + m + offset;

    if (nowMinutes < prayerMinutes) {
      return formatTo12Hour(todayStart);
    } else {
      return formatTo12Hour(tomorrowStart || todayStart);
    }
  }

  function getJamatTime(prayer, today, tomorrow) {
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    const todayData = allData[today]?.[prayer];
    const tomorrowData = allData[tomorrow]?.[prayer];

    const todayJamat = todayData?.jamat || todayData?.start;
    const tomorrowJamat = tomorrowData?.jamat || tomorrowData?.start;

    if (!todayJamat) return formatTo12Hour(tomorrowJamat) || '--';

    const [h, m] = todayJamat.split(':').map(Number);
    const jamatMinutes = h * 60 + m + 5;

    if (nowMinutes < jamatMinutes) {
      return formatTo12Hour(todayJamat);
    } else {
      return formatTo12Hour(tomorrowJamat || todayJamat);
    }
  }

  function loadPrayerTimes() {
    const now = new Date();
    const nowMs = now.getTime();
    const todayStr = now.getFullYear() + '-' +
                 String(now.getMonth() + 1).padStart(2, '0') + '-' +
                 String(now.getDate()).padStart(2, '0');
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    const tomorrowStr = tomorrow.getFullYear() + '-' +
                    String(tomorrow.getMonth() + 1).padStart(2, '0') + '-' +
                    String(tomorrow.getDate()).padStart(2, '0');

    if (!allData[todayStr] || !allData[tomorrowStr]) return;

    document.getElementById('dhuhr-label').textContent = isJumuahPeriod(todayStr) ? 'JUMUAH' : 'DHUHR';
    document.getElementById('jumuah-jamat').textContent = getJamatTime('dhuhr', todayStr, tomorrowStr);

    prayersOrder.forEach(prayer => {
      document.getElementById(`${prayer}-start`).textContent = getStartTime(prayer, todayStr, tomorrowStr);
      if (prayer !== 'sunrise') {
        const todayJamatStr = allData[todayStr]?.[prayer]?.jamat || allData[todayStr]?.[prayer]?.start;
        if (!todayJamatStr) return;
        const [h, m] = todayJamatStr.split(':').map(Number);
        const jamatTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0);
        const jamatMs = jamatTime.getTime();
        const diff = jamatMs - nowMs;
        const elementId = `${prayer}-jamat`;
        if (diff > 0 && diff <= 22000) startCountdown(elementId, jamatTime);
        else document.getElementById(`${prayer}-jamat`).textContent = getJamatTime(prayer, todayStr, tomorrowStr);
      }
    });
  }

  function startCountdown(elementId, targetDateTime) {
    let el = document.getElementById(elementId);
    if (!el) return;
    const today = new Date();
    if (today.getDay() === 5 && elementId === 'dhuhr-jamat') el = document.getElementById('jumuah-jamat');
    const intervalId = setInterval(() => {
      const now = new Date();
      const diff = Math.floor((targetDateTime.getTime() - now.getTime()) / 1000);
      if (diff > 0) {
        el.textContent = diff;
        el.classList.add('countdown');
      } else {
        clearInterval(intervalId);
        el.classList.remove('countdown');
        loadPrayerTimes();
      }
    }, 1000);
  }

  let lastAnnouncement = '';

  function fetchAnnouncement() {
    fetch(`announcement.txt?t=${Date.now()}`)
      .then(response => response.text())
      .then(text => {
        if (text.trim() !== lastAnnouncement) {
          lastAnnouncement = text.trim();
          const announcementEl = document.getElementById('announcement-text');
          announcementEl.textContent = lastAnnouncement;
        }
      })
      .catch(err => {
        console.error('Failed to load announcement:', err);
      });
  }


  const MAX_POSTERS = 5;
  let posterImages = [];
  let posterIndex = 0;

  function shouldIncludePhotosPoster() {
    const now = new Date();
    const day = now.getDay();
    const minutes = now.getHours() * 60 + now.getMinutes();

    // if (day === 4 && minutes >= 1260) return true;
    // if (day === 5 && minutes <= 840) return true;
    return false;
  }

  function preloadAndCheckPosters() {
    let loaded = 0;
    posterImages = [];

    const max = MAX_POSTERS;
    const total = shouldIncludePhotosPoster() ? max + 1 : max;

    for (let i = 1; i <= max; i++) {
      const url = `posters/${i}.jpg?t=${Date.now()}`;
      const img = new Image();
      img.onload = () => {
        posterImages.push(url);
        loaded++;
        if (loaded === total) startPrayerPosterCycle();
      };
      img.onerror = () => {
        loaded++;
        if (loaded === total) startPrayerPosterCycle();
      };
      img.src = url;
    }

    if (shouldIncludePhotosPoster()) {
      const url = `posters/photos.jpg?t=${Date.now()}`;
      const img = new Image();
      img.onload = () => {
        posterImages.push(url);
        loaded++;
        if (loaded === total) startPrayerPosterCycle();
      };
      img.onerror = () => {
        loaded++;
        if (loaded === total) startPrayerPosterCycle();
      };
      img.src = url;
    }
  }

  function cyclePosters() {
    if (posterImages.length === 0) return;

    const overlay = document.getElementById('poster-overlay');
    const img = overlay.querySelector('.poster-img');
    const imgUrl = posterImages[posterIndex % posterImages.length];

    overlay.style.setProperty('--poster-url', `url(${imgUrl})`);
    img.src = imgUrl;
    overlay.style.display = 'block';
    setTimeout(() => {
      overlay.style.opacity = '1';
    }, 10);

    setTimeout(() => {
      overlay.style.opacity = '0';
      setTimeout(() => {
        overlay.style.display = 'none';
        posterIndex++;
      }, 1500);
    }, 10000);
  }
  
  let posterCycleInterval = null;
  function startPrayerPosterCycle() {
    if (posterImages.length === 0 || posterCycleInterval) return;

    posterCycleInterval = setInterval(() => {
      const overlay = document.getElementById('poster-overlay');
      if (!overlay.style.display || overlay.style.display === 'none') {
        cyclePosters();
      }
    }, 60000);
  }

  function stopPosterCycle() {
    if (posterCycleInterval) {
      clearInterval(posterCycleInterval);
      posterCycleInterval = null;
    }
    const overlay = document.getElementById('poster-overlay');
    overlay.style.opacity = '0';
    setTimeout(() => {
      overlay.style.display = 'none';
    }, 1500);
  }

  function refreshPosters() {
    posterImages = [];
    posterIndex = 0;
    preloadAndCheckPosters();
  }

  let makroohShowing = false;

  function checkMakroohPoster() {
    const now = new Date();
    const todayStr = now.getFullYear() + '-' +
      String(now.getMonth() + 1).padStart(2, '0') + '-' +
      String(now.getDate()).padStart(2, '0');

    const dhuhrStartStr = allData[todayStr]?.dhuhr?.start;
    if (!dhuhrStartStr) return;

    const [h, m] = dhuhrStartStr.split(':').map(Number);
    const dhuhrStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m);
    const makroohStart = new Date(dhuhrStart.getTime() - 600000);
    const makroohEnd = new Date(dhuhrStart);

    if (now >= makroohStart && now < makroohEnd) {
      if (!makroohShowing) {
        makroohShowing = true;
        document.getElementById('makrooh-overlay').style.display = 'block';
      }
    } else {
      if (makroohShowing) {
        makroohShowing = false;
        document.getElementById('makrooh-overlay').style.display = 'none';
      }
    }
  }


  function checkLiveStatusAndToggleOverlay() {
    fetch('https://live-status.muhammedkarim.workers.dev')
      .then(res => res.json())
      .then(status => {
        const dimOverlay = document.getElementById('dim-overlay');
        const shouldShowDim = status.isLive && status.kalimat !== 'kk-bayan';
        // dimOverlay.style.display = shouldShowDim ? 'block' : 'none';
        // dimOverlay.style.opacity = shouldShowDim ? '1' : '0';
        if (status.isLive) {
          stopPosterCycle();
          startKalimatPolling();
        } else {
          stopKalimatPolling();
          startPrayerPosterCycle();
        }
      })
      .catch(err => {
        console.error('Failed to fetch live status:', err);
      });
  }

  let currentKalimat = null;
  let kalimatInterval = null;

  function fetchKalimatStatus() {
    fetch('https://live-status.muhammedkarim.workers.dev')
      .then(res => res.json())
      .then(status => {
        const kalimatOverlay = document.getElementById('kalimat-overlay');
        const kalimatImg = kalimatOverlay.querySelector('.kalimat-img');

        if (!status.isLive || !status.kalimat) {
          kalimatOverlay.style.opacity = '0';
          setTimeout(() => {
            kalimatOverlay.style.display = 'none';
          }, 1500);
          currentKalimat = null;
          return;
        }

        if (status.kalimat !== currentKalimat) {
          const kalimatPath = `kalimat/${status.kalimat}.png?t=${Date.now()}`;
          const img = new Image();
          img.onload = () => {
            kalimatImg.src = kalimatPath;
            kalimatOverlay.style.setProperty('--kalimat-url', `url(${kalimatPath})`);
            kalimatOverlay.style.display = 'block';
            setTimeout(() => {
              kalimatOverlay.style.opacity = '1';
            }, 10);
            currentKalimat = status.kalimat;
          };
          img.onerror = () => {
            console.warn(`Missing kalimat image: ${kalimatPath}`);
            kalimatOverlay.style.opacity = '0';
            setTimeout(() => {
              kalimatOverlay.style.display = 'none';
            }, 1500);
            currentKalimat = null;
          };
          img.src = kalimatPath;
        } else {
          kalimatOverlay.style.display = 'block';
          kalimatOverlay.style.opacity = '1';
        }
      })
      .catch(err => {
        console.error('Failed to fetch kalimat:', err);
      });
  }

  function startKalimatPolling() {
    if (!kalimatInterval) {
      kalimatInterval = setInterval(fetchKalimatStatus, 1000);
    }
  }

  function stopKalimatPolling() {
    clearInterval(kalimatInterval);
    kalimatInterval = null;
    currentKalimat = null;
    const overlay = document.getElementById('kalimat-overlay');
    overlay.style.opacity = '0';
    setTimeout(() => {
      overlay.style.display = 'none';
    }, 1500);
  }

  function fetchPrayerTimes() {
    fetch(`prayer-times.json?t=${Date.now()}`)
      .then(res => res.json())
      .then(data => {
        allData = data;
        loadPrayerTimes();
      });
  }
    
  let currentVersion = null;
  function checkVersionAndReload() {
    fetch(`version.json?t=${Date.now()}`)
      .then(res => res.json())
      .then(data => {
        if (currentVersion && data.version !== currentVersion) {
          location.reload(true);
        }
        currentVersion = data.version;
      });
  }
  
  fetchPrayerTimes();
  updateClock();
  loadPrayerTimes();
  fetchAnnouncement();
  preloadAndCheckPosters();
  checkLiveStatusAndToggleOverlay();
  
  setInterval(updateClock, 1000);
  setInterval(loadPrayerTimes, 1000);
  setInterval(checkMakroohPoster, 1000);
  setInterval(fetchAnnouncement, 60000);
  setInterval(fetchPrayerTimes, 300000);
  setInterval(refreshPosters, 300000);
  setInterval(checkLiveStatusAndToggleOverlay, 5000);
  setInterval(checkVersionAndReload, 60000);
}