/* ==========================================================
   Груминг-салон «Пушистый друг» — общий скрипт для всех страниц
   Функции localStorage (требование задания: минимум 2):
     1. Тема оформления (ключ "theme")
     2. Счётчик посещений главной (ключ "visits")
     3. Лайки в блоге (ключ "likes")
     4. Черновик и список сообщений формы (ключи "draft", "messages")
   ========================================================== */
(function () {
  'use strict';

  /* ---------- Безопасная работа с localStorage ---------- */
  var storage = {
    get: function (key, fallback) {
      try {
        var raw = localStorage.getItem(key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch (e) {
        return fallback;
      }
    },
    set: function (key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (e) { /* приватный режим или переполнение — молча пропускаем */ }
    },
    remove: function (key) {
      try { localStorage.removeItem(key); } catch (e) {}
    }
  };

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  /* ---------- 1. Тема оформления ---------- */
  function initTheme() {
    var btn = $('#theme-toggle');
    var root = document.documentElement;

    function current() {
      return root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    }

    function paint() {
      if (btn) btn.textContent = current() === 'dark' ? '☀️' : '🌙';
    }

    paint();
    if (!btn) return;

    btn.addEventListener('click', function () {
      var next = current() === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('theme', next); } catch (e) {}
      paint();
    });
  }

  /* ---------- Мобильное меню ---------- */
  function initMenu() {
    var burger = $('#burger');
    var nav = $('#main-nav');
    if (!burger || !nav) return;

    function setOpen(open) {
      nav.classList.toggle('open', open);
      burger.setAttribute('aria-expanded', String(open));
      burger.textContent = open ? '✕' : '☰';
    }

    burger.addEventListener('click', function () {
      setOpen(!nav.classList.contains('open'));
    });

    // Закрываем меню по клику на ссылку и по Escape
    $$('a', nav).forEach(function (a) {
      a.addEventListener('click', function () { setOpen(false); });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') setOpen(false);
    });
  }

  /* ---------- Год в подвале ---------- */
  function initYear() {
    var el = $('#year');
    if (el) el.textContent = new Date().getFullYear();
  }

  /* ---------- 2. Счётчик посещений (главная) ---------- */
  function initVisitCounter() {
    var el = $('#visit-counter');
    if (!el) return;
    var visits = Number(storage.get('visits', 0)) + 1;
    storage.set('visits', visits);
    el.textContent = visits;
  }

  /* ---------- JS-эффект: печатающийся текст ---------- */
  function initTyping() {
    var el = $('#typing');
    if (!el) return;

    var words;
    try { words = JSON.parse(el.getAttribute('data-words')); } catch (e) { return; }
    if (!words || !words.length) return;

    // Для тех, кто отключил анимацию, оставляем статичный текст
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    var w = 0, i = words[0].length, deleting = true;

    function tick() {
      var word = words[w];
      el.textContent = word.slice(0, i);
      var delay = deleting ? 55 : 110;

      if (deleting && i === 0) {
        deleting = false;
        w = (w + 1) % words.length;
        delay = 350;
      } else if (!deleting && i === words[w].length) {
        deleting = true;
        delay = 1400;
      } else {
        i += deleting ? -1 : 1;
      }
      setTimeout(tick, delay);
    }
    setTimeout(tick, 1400);
  }

  /* ---------- JS-эффект: появление блоков и анимация чисел ---------- */
  function animateCount(el) {
    var target = Number(el.getAttribute('data-count')) || 0;
    var duration = 1200;
    var start = null;

    function step(ts) {
      if (start === null) start = ts;
      var p = Math.min((ts - start) / duration, 1);
      el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function initReveal() {
    var items = $$('.reveal');
    var counters = $$('[data-count]');
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!('IntersectionObserver' in window) || reduce) {
      items.forEach(function (el) { el.classList.add('visible'); });
      counters.forEach(function (el) { el.textContent = el.getAttribute('data-count'); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('visible');
        $$('[data-count]', entry.target).forEach(animateCount);
        io.unobserve(entry.target);
      });
    }, { threshold: 0.15 });

    items.forEach(function (el) { io.observe(el); });
  }

  /* ---------- Кнопка «Наверх» ---------- */
  function initToTop() {
    var btn = $('#to-top');
    if (!btn) return;

    window.addEventListener('scroll', function () {
      btn.classList.toggle('show', window.scrollY > 400);
    }, { passive: true });

    btn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ---------- Поиск по контенту ---------- */
  // <input data-search="#list"> фильтрует элементы [data-searchable] внутри #list
  function initSearch() {
    $$('[data-search]').forEach(function (input) {
      var list = $(input.getAttribute('data-search'));
      if (!list) return;
      var empty = list.parentNode.querySelector('.empty-state');
      var items = $$('[data-searchable]', list);

      input.addEventListener('input', function () {
        var q = input.value.trim().toLowerCase();
        var shown = 0;

        items.forEach(function (item) {
          var match = item.textContent.toLowerCase().indexOf(q) !== -1;
          item.style.display = match ? '' : 'none';
          if (match) shown++;
        });

        if (empty) empty.classList.toggle('show', shown === 0);
      });
    });
  }

  /* ---------- 3. Лайки в блоге ---------- */
  function initLikes() {
    var buttons = $$('[data-like]');
    if (!buttons.length) return;

    // Формат: { "post-id": { liked: true, count: 3 } }
    var state = storage.get('likes', {});

    function paint(btn) {
      var id = btn.getAttribute('data-like');
      var s = state[id] || { liked: false, count: 0 };
      btn.classList.toggle('liked', s.liked);
      btn.setAttribute('aria-pressed', String(s.liked));
      $('.heart', btn).textContent = s.liked ? '❤️' : '🤍';
      $('.count', btn).textContent = s.count;
    }

    buttons.forEach(function (btn) {
      paint(btn);
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-like');
        var s = state[id] || { liked: false, count: 0 };
        s.liked = !s.liked;
        s.count = Math.max(0, s.count + (s.liked ? 1 : -1));
        state[id] = s;
        storage.set('likes', state);
        paint(btn);
      });
    });
  }

  /* ---------- 4. Форма контактов: черновик и сообщения ---------- */
  function initContactForm() {
    var form = $('#contact-form');
    if (!form) return;

    var fields = ['name', 'email', 'breed', 'service', 'message'];
    var list = $('#messages');
    var alertBox = $('#form-alert');
    var clearBtn = $('#clear-messages');

    // Восстанавливаем черновик
    var draft = storage.get('draft', {});
    fields.forEach(function (f) {
      if (draft[f] && form.elements[f]) form.elements[f].value = draft[f];
    });

    // Автосохранение черновика при вводе
    form.addEventListener('input', function () {
      var d = {};
      fields.forEach(function (f) { if (form.elements[f]) d[f] = form.elements[f].value; });
      storage.set('draft', d);
    });

    function renderMessages() {
      var messages = storage.get('messages', []);
      list.textContent = '';

      if (!messages.length) {
        var p = document.createElement('p');
        p.className = 'muted';
        p.textContent = 'Пока пусто.';
        list.appendChild(p);
        clearBtn.style.display = 'none';
        return;
      }

      clearBtn.style.display = '';
      messages.slice().reverse().forEach(function (m) {
        var box = document.createElement('div');
        box.className = 'message';

        var head = document.createElement('strong');
        head.textContent = m.name;

        var meta = document.createElement('small');
        meta.textContent = ' · ' + m.email + ' · ' + m.date;

        var text = document.createElement('p');
        text.style.margin = '6px 0 0';
        text.textContent = [m.service, m.breed].filter(Boolean).join(', ') + (m.message ? ': ' + m.message : '');

        box.appendChild(head);
        box.appendChild(meta);
        box.appendChild(text);
        list.appendChild(box);
      });
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var name = form.elements.name.value.trim();
      var email = form.elements.email.value.trim();
      var message = form.elements.message.value.trim();
      var emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

      if (!name || !emailOk || !message) {
        alertBox.textContent = 'Заполните все поля и проверьте email.';
        alertBox.classList.add('show');
        return;
      }

      var messages = storage.get('messages', []);
      messages.push({
        name: name,
        email: email,
        breed: form.elements.breed.value.trim(),
        service: form.elements.service.value,
        message: message,
        date: new Date().toLocaleString('ru-RU')
      });
      storage.set('messages', messages);
      storage.remove('draft');

      form.reset();
      alertBox.textContent = 'Спасибо! Заявка сохранена ниже.';
      alertBox.classList.add('show');
      renderMessages();
    });

    clearBtn.addEventListener('click', function () {
      storage.remove('messages');
      renderMessages();
    });

    renderMessages();
  }

  /* ---------- Запуск ---------- */
  document.addEventListener('DOMContentLoaded', function () {
    initTheme();
    initMenu();
    initYear();
    initVisitCounter();
    initTyping();
    initReveal();
    initToTop();
    initSearch();
    initLikes();
    initContactForm();
  });
})();
