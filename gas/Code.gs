/**
 * 野津税理士事務所 HP お問い合わせフォーム受信
 *
 * - nozu.tax@gmail.com へ通知メール
 * - 送信者へ受付確認メール
 * - ハニーポット（website 欄）とメール単位の連投制限あり
 *
 * デプロイ手順は同フォルダの「デプロイ手順.md」を参照
 */

// --- 設定 ---
var OFFICE_EMAIL = 'nozu.tax@gmail.com';
var RATE_LIMIT_SECONDS = 60;   // 同一メールからの再送まで秒数
var MAX_NAME_LENGTH = 100;
var MAX_ORG_LENGTH = 200;
var MAX_BODY_LENGTH = 5000;

/**
 * フォームからの POST を受け取る
 */
function doPost(e) {
  try {
    var data = parseBody_(e);

    // ハニーポット：値が入っていたら成功を装って何もしない（ボット向け）
    if (data.website) {
      return json_({ ok: true });
    }

    var name = String(data.name || '').trim();
    var email = String(data.email || '').trim();
    var org = String(data.org || '').trim();
    var category = String(data.category || '').trim() || 'その他';
    var body = String(data.body || '').trim();

    if (!name || !email || !body) {
      return json_({ ok: false, error: 'required' });
    }
    if (!isValidEmail_(email)) {
      return json_({ ok: false, error: 'email' });
    }
    if (name.length > MAX_NAME_LENGTH ||
        org.length > MAX_ORG_LENGTH ||
        body.length > MAX_BODY_LENGTH) {
      return json_({ ok: false, error: 'too_long' });
    }

    // 連投制限（メールアドレス単位）
    var cache = CacheService.getScriptCache();
    var rateKey = 'rate_' + email.toLowerCase();
    if (cache.get(rateKey)) {
      return json_({ ok: false, error: 'rate_limit' });
    }
    cache.put(rateKey, '1', RATE_LIMIT_SECONDS);

    sendOfficeMail_(name, email, org, category, body);
    sendConfirmMail_(name, email, category);

    return json_({ ok: true });
  } catch (err) {
    console.error(String(err));
    return json_({ ok: false, error: 'server' });
  }
}

/**
 * 動作確認用（ブラウザで URL を開くと JSON が返る）
 */
function doGet() {
  return json_({ ok: true, service: 'nozutax-contact' });
}

// --- メール送信 ---

function sendOfficeMail_(name, email, org, category, body) {
  var lines = [
    'ホームページのお問い合わせフォームから連絡がありました。',
    '',
    '■ お名前',
    name,
    '',
    '■ 医療機関名・法人名',
    org || '（未記入）',
    '',
    '■ メールアドレス',
    email,
    '',
    '■ ご相談の区分',
    category,
    '',
    '■ ご相談内容',
    body,
    '',
    '----',
    'このメールに返信すると、相手（' + email + '）へ送れます。'
  ];

  MailApp.sendEmail({
    to: OFFICE_EMAIL,
    replyTo: email,
    name: name,
    subject: '【HPお問い合わせ】' + category + ' / ' + name,
    body: lines.join('\n')
  });
}

function sendConfirmMail_(name, email, category) {
  var lines = [
    name + ' 様',
    '',
    'この度は野津税理士事務所へお問い合わせいただき、ありがとうございます。',
    '以下の内容で受け付けました。内容を確認のうえ、追ってご連絡いたします。',
    '',
    '■ ご相談の区分：' + category,
    '',
    '※このメールは送信確認の自動配信です。返信は必要ありません。',
    '※お急ぎの場合は nozu.tax@gmail.com まで直接ご連絡ください。',
    '',
    '――――――――――',
    '野津税理士事務所',
    '〒936-0026　富山県滑川市公園通りA-2',
    'Mail：nozu.tax@gmail.com',
    '――――――――――'
  ];

  MailApp.sendEmail({
    to: email,
    subject: '【野津税理士事務所】お問い合わせを受け付けました',
    body: lines.join('\n')
  });
}

// --- ユーティリティ ---

function parseBody_(e) {
  if (e && e.postData && e.postData.contents) {
    return JSON.parse(e.postData.contents);
  }
  return (e && e.parameter) || {};
}

function isValidEmail_(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
