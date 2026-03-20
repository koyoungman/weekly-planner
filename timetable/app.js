'use strict';

// ── 상수 ──────────────────────────────────────────────────
const DAYS        = ['mon', 'tue', 'wed', 'thu', 'fri'];
const CELL_HEIGHT = 36;       // px / 30분 슬롯
const PX_PER_MIN  = CELL_HEIGHT / 30; // px / 1분 (1.2px)
const START_HOUR  = 8;
const END_HOUR    = 20;
const TOTAL_SLOTS = (END_HOUR - START_HOUR) * 2; // 24슬롯
const TOTAL_MINS  = (END_HOUR - START_HOUR) * 60; // 720분

const PRESET_COLORS = [
  '#FFD166', '#06D6A0', '#4ECDC4', '#118AB2',
  '#EF476F', '#F4A261', '#B5838D', '#e8eaf0'
];

// ── 상태 ──────────────────────────────────────────────────
let currentEvents = null;   // Firebase 최신 스냅샷
let editingId     = null;   // null = 추가, string = 편집
let selectedColor = PRESET_COLORS[0];
let colPositions  = [];     // [{day, left, width}, …] — 렌더 후 캐시

// ── 시간 변환 ──────────────────────────────────────────────
function slotToTime(slot) {
  const h = START_HOUR + Math.floor(slot / 2);
  const m = slot % 2 === 0 ? '00' : '30';
  return `${String(h).padStart(2, '0')}:${m}`;
}

// 시작시간 기준 경과 분 (08:40 → 40, 09:10 → 70)
function timeToMinutes(t) {
  const [h, m] = t.split(':').map(Number);
  return (h - START_HOUR) * 60 + m;
}

// 경과 분 → 시간 문자열 (70 → "09:10")
function minutesToTime(mins) {
  const total = START_HOUR * 60 + mins;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// 배경색 명도로 텍스트 색상 결정
function getTextColor(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 0.299 + g * 0.587 + b * 0.114) > 160 ? '#333333' : '#ffffff';
}

// ── 정적 그리드 생성 ────────────────────────────────────────
function buildGrid() {
  const body = document.getElementById('timetable-body');

  for (let slot = 0; slot < TOTAL_SLOTS; slot++) {
    const row = document.createElement('div');
    row.className = 'time-row';
    row.dataset.slot = slot;

    // 시간 레이블: 정시(:00)만 표시
    const lbl = document.createElement('div');
    lbl.className = 'time-label';
    lbl.textContent = slot % 2 === 0 ? slotToTime(slot) : '';
    row.appendChild(lbl);

    // 요일 셀
    DAYS.forEach(day => {
      const cell = document.createElement('div');
      cell.className = 'day-cell';
      cell.dataset.day = day;
      cell.dataset.slot = slot;
      cell.addEventListener('click', () => openAddModal(day, slot));
      row.appendChild(cell);
    });

    body.appendChild(row);
  }
}

// ── 컬럼 위치 캐시 (렌더 후 한 번 계산) ─────────────────────
function cacheColumnPositions() {
  const firstRow = document.querySelector('.time-row');
  if (!firstRow) return;
  const cells = firstRow.querySelectorAll('.day-cell');
  colPositions = Array.from(cells).map((cell, i) => ({
    day  : DAYS[i],
    left : cell.offsetLeft,
    width: cell.offsetWidth
  }));
}

// ── 이벤트 블록 렌더링 ─────────────────────────────────────
function renderEvents() {
  document.querySelectorAll('.event-block').forEach(el => el.remove());
  if (!currentEvents) return;

  cacheColumnPositions();
  if (!colPositions.length || colPositions[0].width === 0) return;

  const body = document.getElementById('timetable-body');

  Object.values(currentEvents).forEach(event => {
    const startMins    = timeToMinutes(event.startTime);
    const durationMins = timeToMinutes(event.endTime) - startMins;
    if (durationMins <= 0) return;

    // days가 5개 전부이면 전체 너비 span 블록
    const isFullSpan = DAYS.every(d => event.days.includes(d));

    if (isFullSpan) {
      const first = colPositions[0];
      const last  = colPositions[colPositions.length - 1];
      const block = makeBlock(event, startMins, durationMins);
      block.style.left  = `${first.left + 2}px`;
      block.style.width = `${last.left + last.width - first.left - 4}px`;
      body.appendChild(block);
    } else {
      event.days.forEach(day => {
        const col = colPositions.find(c => c.day === day);
        if (!col) return;
        const block = makeBlock(event, startMins, durationMins);
        block.style.left  = `${col.left + 2}px`;
        block.style.width = `${col.width - 4}px`;
        body.appendChild(block);
      });
    }
  });
}

function makeBlock(event, startMins, durationMins) {
  const el = document.createElement('div');
  el.className = 'event-block' + (durationMins < 40 ? ' event-block--compact' : '');
  el.style.top             = `${startMins * PX_PER_MIN}px`;
  el.style.height          = `${durationMins * PX_PER_MIN - 2}px`;
  el.style.backgroundColor = event.color;
  el.style.color           = getTextColor(event.color);
  el.innerHTML = `
    <span class="event-title">${event.title}</span>
    <span class="event-time">${event.startTime}–${event.endTime}</span>
  `;
  el.addEventListener('click', e => {
    e.stopPropagation();
    openEditModal(event);
  });
  return el;
}

// ── Firebase 구독 콜백 ─────────────────────────────────────
function onData(events) {
  currentEvents = events;
  renderEvents();
}

// ── 색상 선택 ──────────────────────────────────────────────
function selectColor(hex) {
  selectedColor = hex;
  document.getElementById('f-color-custom').value = hex;
  document.querySelectorAll('.color-swatch').forEach(s => {
    s.classList.toggle('selected', s.dataset.color === hex);
  });
}

// ── 모달 열기 ──────────────────────────────────────────────
function openAddModal(day, slot) {
  editingId = null;
  document.getElementById('modal-title').textContent = '일정 추가';
  document.getElementById('f-title').value = '';

  document.querySelectorAll('.day-check').forEach(cb => {
    cb.checked = cb.value === day;
  });

  document.getElementById('f-start').value = slotToTime(slot);
  document.getElementById('f-end').value   = slotToTime(Math.min(slot + 2, TOTAL_SLOTS));

  selectColor(PRESET_COLORS[0]);
  document.getElementById('btn-delete').style.display = 'none';
  document.getElementById('event-modal').showModal();
  document.getElementById('f-title').focus();
}

function openEditModal(event) {
  editingId = event.id;
  document.getElementById('modal-title').textContent = '일정 편집';
  document.getElementById('f-title').value = event.title;

  document.querySelectorAll('.day-check').forEach(cb => {
    cb.checked = event.days.includes(cb.value);
  });

  document.getElementById('f-start').value = event.startTime;
  document.getElementById('f-end').value   = event.endTime;

  selectColor(event.color);
  document.getElementById('btn-delete').style.display = 'block';
  document.getElementById('event-modal').showModal();
}

function closeModal() {
  document.getElementById('event-modal').close();
}

// ── 저장 / 삭제 ────────────────────────────────────────────
function handleSubmit(e) {
  e.preventDefault();

  const title = document.getElementById('f-title').value.trim();
  if (!title) return;

  const days = Array.from(document.querySelectorAll('.day-check:checked')).map(cb => cb.value);
  if (days.length === 0) {
    alert('요일을 하나 이상 선택하세요.');
    return;
  }

  const startTime = document.getElementById('f-start').value;
  const endTime   = document.getElementById('f-end').value;
  if (startTime >= endTime) {
    alert('종료 시간은 시작 시간보다 늦어야 합니다.');
    return;
  }

  const event = { title, days, startTime, endTime, color: selectedColor };

  if (editingId) {
    dbUpdate(editingId, { ...event, id: editingId });
  } else {
    dbAdd(event);
  }

  closeModal();
}

function handleDelete() {
  if (!editingId) return;
  if (confirm('이 일정을 삭제하시겠습니까?')) {
    dbRemove(editingId);
    closeModal();
  }
}

// ── 이미지 내보내기 ────────────────────────────────────────
function exportImage() {
  html2canvas(document.getElementById('timetable-wrapper'), { scale: 2 }).then(canvas => {
    const a = document.createElement('a');
    a.download = '시간표.png';
    a.href = canvas.toDataURL();
    a.click();
  });
}

// ── 시간 select 옵션 생성 ──────────────────────────────────
function buildTimeSelects() {
  const startSel = document.getElementById('f-start');
  const endSel   = document.getElementById('f-end');

  // 시작: 08:00 ~ 19:50 (10분 단위)
  for (let m = 0; m < TOTAL_MINS; m += 10) {
    startSel.appendChild(new Option(minutesToTime(m), minutesToTime(m)));
  }

  // 종료: 08:10 ~ 20:00 (10분 단위)
  for (let m = 10; m <= TOTAL_MINS; m += 10) {
    endSel.appendChild(new Option(minutesToTime(m), minutesToTime(m)));
  }
}

// ── 색상 팔레트 버튼 생성 ──────────────────────────────────
function buildColorPalette() {
  const palette = document.getElementById('color-palette');
  PRESET_COLORS.forEach(color => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'color-swatch';
    btn.style.backgroundColor = color;
    btn.dataset.color = color;
    btn.title = color;
    btn.addEventListener('click', () => selectColor(color));
    palette.appendChild(btn);
  });
}

// ── 초기화 ────────────────────────────────────────────────
function init() {
  buildGrid();
  buildTimeSelects();
  buildColorPalette();

  // 이벤트 바인딩
  document.getElementById('event-form').addEventListener('submit', handleSubmit);
  document.getElementById('btn-cancel').addEventListener('click', closeModal);
  document.getElementById('btn-delete').addEventListener('click', handleDelete);
  document.getElementById('btn-export').addEventListener('click', exportImage);

  // backdrop 클릭 시 모달 닫기
  document.getElementById('event-modal').addEventListener('click', e => {
    if (e.target === document.getElementById('event-modal')) closeModal();
  });

  // 커스텀 컬러 피커
  document.getElementById('f-color-custom').addEventListener('input', e => {
    selectedColor = e.target.value;
    document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
  });

  // 창 크기 변경 시 컬럼 위치 재계산 후 재렌더
  window.addEventListener('resize', () => {
    colPositions = [];
    renderEvents();
  });

  // Firebase 실시간 구독
  dbSubscribe(onData);
}

document.addEventListener('DOMContentLoaded', init);
