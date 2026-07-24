/* =========================================================
   野津税理士事務所 HP － 挙動
   依存ライブラリなし
   ========================================================= */
(function () {
  'use strict';

  /* -------------------------------------------------------
     お問い合わせ送信先（Google Apps Script ウェブアプリ URL）
     デプロイ後、gas/デプロイ手順.md に従ってここに貼る
     ------------------------------------------------------- */
  var CONTACT_ENDPOINT = 'https://script.google.com/macros/s/AKfycbyqzW68Z9RW7rCBkSIHhmwh8C65NMG7a1wBnDmNfiw6xmvHxhHPME6L37QIEfJCq2Zm-Q/exec';

  var header    = document.querySelector('.header');
  var nav       = document.getElementById('nav');
  var navToggle = document.getElementById('navToggle');

  /* -------------------------------------------------------
     1. ヘッダー：スクロールしたら地を敷く
     ------------------------------------------------------- */
  var stuck = false;
  function onScroll() {
    var next = window.scrollY > 40;
    if (next !== stuck) {
      stuck = next;
      header.classList.toggle('is-stuck', stuck);
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* -------------------------------------------------------
     2. モバイルメニューの開閉
     ------------------------------------------------------- */
  function setMenu(open) {
    nav.classList.toggle('is-open', open);
    header.classList.toggle('is-menu-open', open);
    navToggle.setAttribute('aria-expanded', String(open));
    navToggle.setAttribute('aria-label', open ? 'メニューを閉じる' : 'メニューを開く');
    // 開いている間は背後のスクロールを止める
    document.body.style.overflow = open ? 'hidden' : '';
  }

  navToggle.addEventListener('click', function () {
    setMenu(navToggle.getAttribute('aria-expanded') !== 'true');
  });

  // メニュー内のリンクを押したら閉じる
  nav.addEventListener('click', function (e) {
    if (e.target.closest('a')) { setMenu(false); }
  });

  // Esc で閉じる
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && navToggle.getAttribute('aria-expanded') === 'true') {
      setMenu(false);
      navToggle.focus();
    }
  });

  // デスクトップ幅に戻したら状態をリセット
  var mq = window.matchMedia('(min-width: 1024px)');
  var onMq = function (e) { if (e.matches) { setMenu(false); } };
  if (mq.addEventListener) { mq.addEventListener('change', onMq); }
  else if (mq.addListener) { mq.addListener(onMq); }

  /* -------------------------------------------------------
     3. スクロールで要素をフェードイン
     ------------------------------------------------------- */
  var targets = Array.prototype.slice.call(document.querySelectorAll('.reveal'));

  function show(el) {
    if (el.classList.contains('is-in')) { return; }
    el.classList.add('is-in');
    if (io) { io.unobserve(el); }
  }

  var io = null;

  if ('IntersectionObserver' in window) {
    io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        // 画面に入った、または既に画面より上へ通り過ぎた要素を表示する
        if (entry.isIntersecting || entry.boundingClientRect.top < 0) {
          show(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });

    targets.forEach(function (el) { io.observe(el); });

    /* 安全網：IntersectionObserver は素早いスクロールやアンカー移動で
       取りこぼすことがあり、取りこぼすと要素が非表示のまま残ってしまう。
       スクロールイベントや requestAnimationFrame は
       「ハッシュリンクで途中に着地してそのまま動かない」場合や
       描画が止まっている環境では発火しないため、どちらにも依存させず
       タイマーで画面内の要素を確実に拾う。
       全て表示し終えたらタイマーを止める。 */
    var sweepTimer = setInterval(function () {
      var vh = window.innerHeight;
      for (var i = targets.length - 1; i >= 0; i--) {
        var el = targets[i];
        if (el.classList.contains('is-in') ||
            el.getBoundingClientRect().top < vh * 0.92) {
          show(el);
          targets.splice(i, 1);
        }
      }
      if (targets.length === 0) { clearInterval(sweepTimer); }
    }, 250);
  } else {
    // 未対応ブラウザは最初から表示
    targets.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* -------------------------------------------------------
     4. お問い合わせフォーム → GAS へ送信
     ------------------------------------------------------- */
  var form = document.getElementById('contactForm');
  var note = document.getElementById('formNote');
  var submitBtn = document.getElementById('contactSubmit');

  function setNote(msg) {
    if (note) { note.textContent = msg; }
  }

  function setBusy(busy) {
    if (!submitBtn) { return; }
    submitBtn.disabled = busy;
    submitBtn.setAttribute('aria-busy', busy ? 'true' : 'false');
  }

  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();

      if (!form.checkValidity()) {
        setNote('必須項目にご記入ください。');
        form.reportValidity();
        return;
      }

      if (!CONTACT_ENDPOINT) {
        setNote('送信設定が未完了です。メール（nozu.tax@gmail.com）でご連絡ください。');
        return;
      }

      var payload = {
        name: (form.elements.name && form.elements.name.value) || '',
        org: (form.elements.org && form.elements.org.value) || '',
        email: (form.elements.email && form.elements.email.value) || '',
        category: (form.elements.category && form.elements.category.value) || '',
        body: (form.elements.body && form.elements.body.value) || '',
        website: (form.elements.website && form.elements.website.value) || ''
      };

      setBusy(true);
      setNote('送信中です…');

      // Content-Type を text/plain にして CORS プリフライトを避ける（GAS向け定石）
      fetch(CONTACT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
        redirect: 'follow'
      })
        .then(function (res) { return res.json(); })
        .then(function (data) {
          if (data && data.ok) {
            setNote('送信しました。確認メールをお送りしましたのでご確認ください。');
            form.reset();
            return;
          }
          if (data && data.error === 'rate_limit') {
            setNote('送信が集中しています。1分ほどおいてから再度お試しください。');
            return;
          }
          setNote('送信に失敗しました。メール（nozu.tax@gmail.com）でご連絡ください。');
        })
        .catch(function () {
          setNote('送信に失敗しました。メール（nozu.tax@gmail.com）でご連絡ください。');
        })
        .then(function () {
          setBusy(false);
        });
    });
  }
})();
