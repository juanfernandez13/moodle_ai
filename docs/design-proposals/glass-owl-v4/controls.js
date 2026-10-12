(() => {
  'use strict';
  const icon = path => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
  const chevron = icon('<path d="m6 9 6 6 6-6"/>');
  const check = icon('<path d="m5 12 4 4L19 6"/>');
  let sequence = 0;
  let activePopup = null;
  let positionFrame = 0;

  // A popover sits above an open preview dialog without blocking its input.
  function createPopup(className) {
    const popup = document.createElement('div');
    popup.className = className;
    popup.hidden = true;
    popup.setAttribute('popover', 'manual');
    return popup;
  }
  function positionPopup(popup, anchor) {
    const rect = anchor.getBoundingClientRect();
    const gap = 7;
    const margin = 12;
    const viewport = window.visualViewport;
    const left = viewport?.offsetLeft || 0;
    const top = viewport?.offsetTop || 0;
    const width = viewport?.width || document.documentElement.clientWidth;
    const height = viewport?.height || window.innerHeight;
    popup.style.maxWidth = `${Math.max(0, width - margin * 2)}px`;
    if (popup.classList.contains('select-menu')) popup.style.width = `${Math.min(rect.width, width - margin * 2)}px`;
    const preferred = popup.classList.contains('select-menu') ? 280 : 420;
    popup.style.maxHeight = `${Math.min(preferred, height - margin * 2)}px`;
    const popupRect = popup.getBoundingClientRect();
    const below = top + height - margin - rect.bottom - gap;
    const above = rect.top - top - margin - gap;
    const useAbove = below < popupRect.height && above > below;
    const space = Math.max(80, useAbove ? above : below);
    popup.style.maxHeight = `${Math.min(preferred, space, height - margin * 2)}px`;
    const actualHeight = popup.getBoundingClientRect().height;
    popup.style.left = `${Math.max(left + margin, Math.min(rect.left, left + width - popupRect.width - margin))}px`;
    popup.style.top = `${Math.max(top + margin, useAbove ? rect.top - actualHeight - gap : Math.min(rect.bottom + gap, top + height - actualHeight - margin))}px`;
  }
  function reveal(popup, anchor, close) {
    activePopup?.close();
    activePopup = { popup, anchor, close };
    popup.hidden = false;
    if (typeof popup.showPopover === 'function') popup.showPopover();
    positionPopup(popup, anchor);
  }
  function conceal(popup) {
    if (typeof popup.hidePopover === 'function' && popup.matches(':popover-open')) popup.hidePopover();
    popup.hidden = true;
    if (activePopup?.popup === popup) activePopup = null;
  }
  document.addEventListener('pointerdown', event => {
    if (activePopup && !activePopup.popup.contains(event.target) && !activePopup.anchor.contains(event.target)) activePopup.close();
  }, true);
  document.addEventListener('focusin', event => {
    if (activePopup && !activePopup.popup.contains(event.target) && !activePopup.anchor.contains(event.target)) activePopup.close();
  });
  function reposition() {
    cancelAnimationFrame(positionFrame);
    positionFrame = requestAnimationFrame(() => {
      if (activePopup) positionPopup(activePopup.popup, activePopup.anchor);
    });
  }
  window.addEventListener('resize', reposition);
  document.addEventListener('scroll', reposition, true);
  window.visualViewport?.addEventListener('resize', reposition);
  window.visualViewport?.addEventListener('scroll', reposition);

  for (const select of document.querySelectorAll('select:not([multiple])')) {
    if (select.dataset.customSelect === 'ready') continue;
    select.dataset.customSelect = 'ready';
    const id = select.id || `select-${++sequence}`;
    if (!select.id) select.id = id;
    const wrapper = document.createElement('div');
    wrapper.className = 'select-field';
    select.before(wrapper);
    wrapper.append(select);
    select.classList.add('select-source');
    select.tabIndex = -1;
    select.setAttribute('aria-hidden', 'true');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'select-trigger';
    button.id = `${id}-trigger`;
    button.setAttribute('role', 'combobox');
    button.setAttribute('aria-haspopup', 'listbox');
    button.setAttribute('aria-expanded', 'false');
    const text = document.createElement('span');
    text.id = `${id}-value`;
    button.append(text);
    button.insertAdjacentHTML('beforeend', chevron);
    const labels = [...select.labels];
    if (labels.length) {
      labels.forEach((label, index) => { if (!label.id) label.id = `${id}-label-${index}`; });
      button.setAttribute('aria-labelledby', `${labels.map(label => label.id).join(' ')} ${text.id}`);
    } else button.setAttribute('aria-label', select.getAttribute('aria-label') || 'Escolher opção');
    if (select.hasAttribute('aria-describedby')) button.setAttribute('aria-describedby', select.getAttribute('aria-describedby'));
    const menu = createPopup('select-menu');
    menu.id = `${id}-options`;
    menu.setAttribute('role', 'listbox');
    menu.setAttribute('aria-label', labels.map(label => label.textContent.trim()).join(' ') || 'Opções');
    button.setAttribute('aria-controls', menu.id);
    wrapper.append(button, menu);
    let highlighted = select.selectedIndex;
    let typeahead = '';
    let typeaheadTimer;
    const available = () => [...select.options].map((option, index) => ({ option, index })).filter(({ option }) => !option.disabled && !option.closest('optgroup')?.disabled && !option.hidden);
    const isOpen = () => !menu.hidden;
    function sync() {
      text.textContent = select.selectedOptions[0]?.textContent || 'Escolher opção';
      button.disabled = select.disabled;
      button.setAttribute('aria-required', String(select.required));
      button.setAttribute('aria-invalid', String(select.getAttribute('aria-invalid') === 'true'));
      if (select.disabled && isOpen()) close();
    }
    function paint() {
      menu.replaceChildren();
      let previousGroup;
      [...select.options].forEach((option, index) => {
        if (option.hidden) return;
        const group = option.closest('optgroup');
        if (group && group !== previousGroup) {
          const heading = document.createElement('div');
          heading.className = 'select-group-label';
          heading.textContent = group.label;
          heading.setAttribute('role', 'presentation');
          menu.append(heading);
        }
        previousGroup = group;
        const item = document.createElement('div');
        item.className = 'select-option';
        item.id = `${id}-option-${index}`;
        item.setAttribute('role', 'option');
        item.setAttribute('aria-selected', String(index === select.selectedIndex));
        const disabled = option.disabled || Boolean(group?.disabled);
        item.setAttribute('aria-disabled', String(disabled));
        item.classList.toggle('is-active', index === highlighted);
        const name = document.createElement('span');
        name.textContent = option.textContent;
        item.append(name);
        if (index === select.selectedIndex) item.insertAdjacentHTML('beforeend', check);
        item.addEventListener('pointermove', () => { if (!disabled) highlight(index); });
        item.addEventListener('pointerdown', event => event.preventDefault());
        item.addEventListener('click', () => { if (!disabled) choose(index); });
        menu.append(item);
      });
      highlight(highlighted);
    }
    function highlight(index) {
      highlighted = index;
      for (const item of menu.querySelectorAll('.select-option')) item.classList.toggle('is-active', item.id === `${id}-option-${index}`);
      const current = document.getElementById(`${id}-option-${index}`);
      if (current) {
        button.setAttribute('aria-activedescendant', current.id);
        if (isOpen()) current.scrollIntoView({ block: 'nearest' });
      } else button.removeAttribute('aria-activedescendant');
    }
    function close() {
      conceal(menu);
      button.setAttribute('aria-expanded', 'false');
      button.removeAttribute('aria-activedescendant');
      clearTimeout(typeaheadTimer);
      typeahead = '';
    }
    function open() {
      sync();
      if (button.disabled) return;
      highlighted = available().find(({ index }) => index === select.selectedIndex)?.index ?? available()[0]?.index ?? -1;
      paint();
      button.setAttribute('aria-expanded', 'true');
      reveal(menu, wrapper, close);
      highlight(highlighted);
    }
    function choose(index) {
      select.selectedIndex = index;
      select.dispatchEvent(new Event('input', { bubbles: true }));
      select.dispatchEvent(new Event('change', { bubbles: true }));
      sync();
      close();
      button.focus({ preventScroll: true });
    }
    function move(delta) {
      const choices = available();
      if (!choices.length) return;
      const current = choices.findIndex(({ index }) => index === highlighted);
      highlight(choices[Math.max(0, Math.min(choices.length - 1, current + delta))].index);
    }
    button.addEventListener('click', () => isOpen() ? close() : open());
    button.addEventListener('focus', sync);
    button.addEventListener('keydown', event => {
      if (event.key === 'Escape' && isOpen()) { event.preventDefault(); event.stopPropagation(); close(); return; }
      if (event.key === 'Tab') { close(); return; }
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        if (isOpen() && highlighted >= 0) choose(highlighted); else open();
        return;
      }
      if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
        event.preventDefault();
        if (!isOpen()) open();
        if (event.key === 'ArrowDown') move(1);
        if (event.key === 'ArrowUp') move(-1);
        if (event.key === 'Home') highlight(available()[0]?.index ?? -1);
        if (event.key === 'End') highlight(available().at(-1)?.index ?? -1);
        return;
      }
      if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
        if (!isOpen()) open();
        typeahead += event.key.toLocaleLowerCase('pt-BR');
        clearTimeout(typeaheadTimer);
        typeaheadTimer = setTimeout(() => { typeahead = ''; }, 600);
        const match = available().find(({ option }) => option.textContent.trim().toLocaleLowerCase('pt-BR').startsWith(typeahead));
        if (match) highlight(match.index);
      }
    });
    labels.forEach(label => label.addEventListener('click', event => { event.preventDefault(); button.focus(); }));
    select.addEventListener('focus', () => button.focus());
    select.addEventListener('change', () => { sync(); if (isOpen()) paint(); });
    select.addEventListener('invalid', event => { event.preventDefault(); button.setAttribute('aria-invalid', 'true'); button.focus(); });
    select.form?.addEventListener('reset', () => queueMicrotask(() => { close(); sync(); }));
    // Static prototype: refresh from the native select on focus, change and reset.
    // Future live option/disabled mutations need an explicit refresh contract.
    sync();
  }

  const inputs = [...document.querySelectorAll('input[data-datepicker]')];
  if (!inputs.length) return;
  const calendar = createPopup('calendar-popover');
  calendar.id = 'date-calendar';
  calendar.setAttribute('role', 'dialog');
  calendar.setAttribute('aria-modal', 'false');
  calendar.setAttribute('aria-labelledby', 'calendar-title');
  calendar.setAttribute('aria-describedby', 'calendar-context calendar-keyboard');
  calendar.innerHTML = `<p id="calendar-context" class="calendar-context"></p><div class="calendar-header"><button type="button" class="calendar-nav" data-month="-1" aria-label="Mês anterior">${icon('<path d="m15 6-6 6 6 6"/>')}</button><h2 class="calendar-title" id="calendar-title" aria-live="polite"></h2><button type="button" class="calendar-nav" data-month="1" aria-label="Próximo mês">${icon('<path d="m9 6 6 6-6 6"/>')}</button></div><table class="calendar-table" role="grid" aria-labelledby="calendar-title"><thead><tr>${['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => `<th scope="col">${day}</th>`).join('')}</tr></thead><tbody></tbody></table><div class="calendar-footer"><button type="button" data-calendar="today">Hoje</button><button type="button" data-calendar="clear">Limpar</button><button type="button" data-calendar="close">Fechar</button></div><p id="calendar-keyboard" class="calendar-keyboard">Digite a data no campo ou escolha um dia.</p>`;
  document.body.append(calendar);
  const today = () => { const date = new Date(); return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12); };
  const firstDate = new Date(1900, 0, 1, 12);
  const lastDate = new Date(2100, 11, 31, 12);
  const clamp = date => new Date(Math.max(firstDate.getTime(), Math.min(lastDate.getTime(), date.getTime())));
  const sameDate = (a, b) => Boolean(a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate());
  const format = date => `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
  const parse = value => {
    const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
    if (!match || +match[3] < 1900 || +match[3] > 2100) return null;
    const date = new Date(+match[3], +match[2] - 1, +match[1], 12);
    return date.getDate() === +match[1] && date.getMonth() === +match[2] - 1 && date.getFullYear() === +match[3] ? date : null;
  };
  const mask = digits => digits.slice(0, 2) + (digits.length > 2 ? `/${digits.slice(2, 4)}` : '') + (digits.length > 4 ? `/${digits.slice(4, 8)}` : '');
  const digitCount = value => value.replace(/\D/g, '').length;
  function caretForDigits(value, count) {
    if (!count) return 0;
    let digits = 0;
    for (let index = 0; index < value.length; index++) if (/\d/.test(value[index]) && ++digits === count) return index + 1;
    return value.length;
  }
  let activeInput = null;
  let focusedDate = clamp(today());
  let selectedDate = null;
  let viewDate = clamp(today());
  const isOpen = () => !calendar.hidden;
  function clearError(input) {
    input.setCustomValidity('');
    input.setAttribute('aria-invalid', 'false');
    document.getElementById(input.dataset.dateError).hidden = true;
  }
  function validate(input) {
    const invalid = Boolean(input.value.trim()) && !parse(input.value);
    input.setCustomValidity(invalid ? 'Digite uma data válida entre 1900 e 2100, no formato dia/mês/ano.' : '');
    input.setAttribute('aria-invalid', String(invalid));
    document.getElementById(input.dataset.dateError).hidden = !invalid;
    return !invalid;
  }
  function closeCalendar(restoreFocus = false) {
    conceal(calendar);
    if (activeInput) {
      activeInput.setAttribute('aria-expanded', 'false');
      activeInput.parentElement.querySelector('.date-open').setAttribute('aria-expanded', 'false');
      if (restoreFocus) activeInput.focus({ preventScroll: true });
    }
  }
  function selectDate(date) {
    activeInput.value = date ? format(date) : '';
    clearError(activeInput);
    activeInput.dispatchEvent(new Event('input', { bubbles: true }));
    activeInput.dispatchEvent(new Event('change', { bubbles: true }));
    closeCalendar(true);
  }
  function render(focus = false) {
    calendar.querySelector('.calendar-title').textContent = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(viewDate);
    calendar.querySelector('[data-month="-1"]').disabled = viewDate.getFullYear() === 1900 && viewDate.getMonth() === 0;
    calendar.querySelector('[data-month="1"]').disabled = viewDate.getFullYear() === 2100 && viewDate.getMonth() === 11;
    const body = calendar.querySelector('tbody');
    body.replaceChildren();
    const first = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1, 12);
    const start = new Date(first);
    start.setDate(1 - first.getDay());
    for (let row = 0; row < 6; row++) {
      const tr = document.createElement('tr');
      for (let col = 0; col < 7; col++) {
        const date = new Date(start);
        date.setDate(start.getDate() + row * 7 + col);
        const td = document.createElement('td');
        td.setAttribute('role', 'gridcell');
        td.setAttribute('aria-selected', String(sameDate(date, selectedDate)));
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'calendar-day';
        button.textContent = String(date.getDate());
        button.disabled = date < firstDate || date > lastDate;
        button.classList.toggle('outside', date.getMonth() !== viewDate.getMonth());
        button.dataset.selected = String(sameDate(date, selectedDate));
        button.tabIndex = sameDate(date, focusedDate) && !button.disabled ? 0 : -1;
        button.setAttribute('aria-label', new Intl.DateTimeFormat('pt-BR', { dateStyle: 'full' }).format(date));
        if (sameDate(date, today())) button.setAttribute('aria-current', 'date');
        button.addEventListener('click', () => selectDate(date));
        button.addEventListener('keydown', event => navigate(event, date));
        td.append(button);
        tr.append(td);
      }
      body.append(tr);
    }
    if (focus) body.querySelector('button[tabindex="0"]')?.focus({ preventScroll: true });
  }
  function shiftMonth(delta, focus = true) {
    const day = focusedDate.getDate();
    const next = new Date(viewDate.getFullYear(), viewDate.getMonth() + delta, 1, 12);
    next.setDate(Math.min(day, new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()));
    focusedDate = clamp(next);
    viewDate = new Date(focusedDate);
    render(focus);
  }
  function navigate(event, date) {
    if (event.key === 'PageUp' || event.key === 'PageDown') {
      event.preventDefault();
      shiftMonth((event.key === 'PageUp' ? -1 : 1) * (event.shiftKey ? 12 : 1));
      return;
    }
    const steps = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    let delta = steps[event.key];
    if (event.key === 'Home') delta = -date.getDay();
    if (event.key === 'End') delta = 6 - date.getDay();
    if (delta === undefined) return;
    event.preventDefault();
    const next = new Date(date);
    next.setDate(date.getDate() + delta);
    focusedDate = clamp(next);
    viewDate = new Date(focusedDate);
    render(true);
  }
  function openCalendar(input, moveFocus = false) {
    if (input.disabled || input.readOnly) return;
    if (activeInput === input && isOpen()) {
      if (moveFocus) calendar.querySelector('button[tabindex="0"]')?.focus({ preventScroll: true });
      return;
    }
    activePopup?.close();
    activeInput = input;
    selectedDate = parse(input.value);
    focusedDate = selectedDate || clamp(today());
    viewDate = new Date(focusedDate);
    (input.closest('dialog[open]') || document.body).append(calendar);
    calendar.querySelector('.calendar-context').textContent = [...input.labels].map(label => label.textContent.trim()).join(' ') || 'Escolher data';
    render();
    input.setAttribute('aria-expanded', 'true');
    input.parentElement.querySelector('.date-open').setAttribute('aria-expanded', 'true');
    reveal(calendar, input.parentElement, () => closeCalendar());
    if (moveFocus) calendar.querySelector('button[tabindex="0"]')?.focus({ preventScroll: true });
  }
  for (const input of inputs) {
    const label = [...input.labels].map(item => item.textContent.trim()).join(' ') || 'Data';
    if (!input.id) input.id = `date-${++sequence}`;
    input.type = 'text';
    input.inputMode = 'numeric';
    input.placeholder = 'dd/mm/aaaa';
    input.maxLength = 10;
    input.autocomplete = 'off';
    input.pattern = '\\d{2}/\\d{2}/\\d{4}';
    input.setAttribute('aria-haspopup', 'dialog');
    input.setAttribute('aria-controls', calendar.id);
    input.setAttribute('aria-expanded', 'false');
    const wrapper = document.createElement('div');
    wrapper.className = 'date-field';
    input.before(wrapper);
    wrapper.append(input);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'date-open';
    button.setAttribute('aria-label', `Escolher data: ${label}`);
    button.setAttribute('aria-haspopup', 'dialog');
    button.setAttribute('aria-controls', calendar.id);
    button.setAttribute('aria-expanded', 'false');
    button.innerHTML = icon('<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 11h18M8 15h2m4 0h2m-8 3h2"/>');
    wrapper.append(button);
    const error = document.createElement('p');
    error.id = `${input.id}-format-error`;
    error.className = 'date-validation';
    error.setAttribute('role', 'alert');
    error.textContent = 'Use uma data válida entre 1900 e 2100: dd/mm/aaaa.';
    error.hidden = true;
    wrapper.after(error);
    input.dataset.dateError = error.id;
    input.setAttribute('aria-describedby', `${input.getAttribute('aria-describedby') || ''} ${error.id}`.trim());
    input.addEventListener('input', () => {
      const raw = input.value;
      const startDigits = digitCount(raw.slice(0, input.selectionStart ?? raw.length));
      const endDigits = digitCount(raw.slice(0, input.selectionEnd ?? raw.length));
      const formatted = mask(raw.replace(/\D/g, '').slice(0, 8));
      if (formatted !== raw) {
        input.value = formatted;
        input.setSelectionRange(caretForDigits(formatted, startDigits), caretForDigits(formatted, endDigits));
      }
      clearError(input);
      if (activeInput === input && isOpen()) {
        selectedDate = parse(input.value);
        if (selectedDate) { focusedDate = selectedDate; viewDate = new Date(selectedDate); }
        render();
      }
    });
    input.addEventListener('beforeinput', event => {
      if (input.selectionStart !== input.selectionEnd) return;
      const caret = input.selectionStart;
      let start;
      let end;
      if (event.inputType === 'deleteContentBackward' && input.value[caret - 1] === '/') { start = caret - 2; end = caret; }
      if (event.inputType === 'deleteContentForward' && input.value[caret] === '/') { start = caret; end = caret + 2; }
      if (start === undefined) return;
      event.preventDefault();
      input.setRangeText('', start, end, 'start');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    input.addEventListener('blur', () => validate(input));
    input.addEventListener('invalid', () => validate(input));
    input.addEventListener('click', () => openCalendar(input));
    input.addEventListener('keydown', event => {
      if (event.key === 'ArrowDown' && event.altKey) { event.preventDefault(); openCalendar(input, true); }
      if (event.key === 'Escape' && activeInput === input && isOpen()) { event.preventDefault(); event.stopPropagation(); closeCalendar(); }
    });
    button.addEventListener('click', () => activeInput === input && isOpen() ? closeCalendar(true) : openCalendar(input, true));
    input.form?.addEventListener('submit', event => {
      if (!validate(input)) { event.preventDefault(); input.reportValidity(); input.focus(); }
    }, true);
    input.form?.addEventListener('reset', () => queueMicrotask(() => { clearError(input); if (activeInput === input) closeCalendar(); }));
  }
  calendar.querySelectorAll('[data-month]').forEach(button => button.addEventListener('click', () => shiftMonth(+button.dataset.month, false)));
  calendar.querySelector('[data-calendar="today"]').addEventListener('click', () => selectDate(clamp(today())));
  calendar.querySelector('[data-calendar="clear"]').addEventListener('click', () => selectDate(null));
  calendar.querySelector('[data-calendar="close"]').addEventListener('click', () => closeCalendar(true));
  calendar.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeCalendar(true); }
  });
  document.querySelectorAll('dialog').forEach(dialog => dialog.addEventListener('close', () => {
    if (activeInput && dialog.contains(activeInput)) closeCalendar();
  }));
})();
