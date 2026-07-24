/* =========================================================
   野津税理士事務所 デザイン案 － 挙動
   依存ライブラリなし
   ========================================================= */
(function () {
  'use strict';

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
     4. お問い合わせフォーム
        デザイン案のため送信処理は行わない。
        Wix へ移植する際は Wix Forms 部品に差し替える。
     ------------------------------------------------------- */
  var form = document.getElementById('contactForm');
  var note = document.getElementById('formNote');

  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.checkValidity()) {
        note.textContent = '必須項目にご記入ください。';
        form.reportValidity();
        return;
      }
      note.textContent = 'デザイン案のため、フォームからの送信は行われません。実際のお問い合わせは nozu.tax@gmail.com までお願いいたします。';
    });
  }
})();
