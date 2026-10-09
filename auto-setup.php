<?php
/* ============================================================
   AUTO SETUP — TỰ ĐỘNG TẠO BẢNG DATABASE
   Chỉ cần mở 1 lần: /api/auto-setup.php
   ============================================================ */

require_once __DIR__ . '/config.php';

header('Content-Type: text/html; charset=utf-8');

echo '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">';
echo '<title>Auto Setup - BONSICOLA</title>';
echo '<style>body{font-family:sans-serif;background:linear-gradient(135deg,#667eea,#764ba2);padding:20px;margin:0;min-height:100vh}.box{max-width:600px;margin:0 auto;background:#fff;border-radius:16px;padding:24px;box-shadow:0 20px 60px rgba(0,0,0,.3)}.ok{background:#ecfdf5;border-left:5px solid #10b981;padding:16px;border-radius:8px;margin:8px 0}h1{font-size:22px;color:#0f172a}.step{background:#f8fafc;padding:12px;border-radius:8px;margin:8px 0;font-size:14px;border-left:4px solid #3b5bfd}code{background:#f1f5f9;padding:3px 8px;border-radius:5px;font-family:monospace;color:#dc2626}.btn{display:inline-block;padding:12px 24px;background:#3b5bfd;color:#fff;text-decoration:none;border-radius:8px;font-weight:700;margin-top:16px}</style></head><body><div class="box">';

echo '<h1>🔧 AUTO SETUP DATABASE</h1>';

try {
    $pdo = new PDO('mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4', DB_USER, DB_PASS,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);

    echo '<div class="ok">✅ Đã kết nối database: <code>' . DB_NAME . '</code></div>';

    /* Tạo bảng users */
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            email VARCHAR(150) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            name VARCHAR(100),
            balance BIGINT DEFAULT 0,
            key_expiry BIGINT DEFAULT 0,
            is_admin TINYINT DEFAULT 0,
            ip VARCHAR(50),
            last_login BIGINT DEFAULT 0,
            created_at BIGINT DEFAULT 0
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");
    echo '<div class="step">✅ Bảng <b>users</b> — OK</div>';

    /* Tạo bảng keys */
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `keys` (
            id INT AUTO_INCREMENT PRIMARY KEY,
            code VARCHAR(50) UNIQUE NOT NULL,
            days INT DEFAULT 1,
            used TINYINT DEFAULT 0,
            used_by VARCHAR(150),
            created_at BIGINT DEFAULT 0,
            used_at BIGINT DEFAULT 0
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");
    echo '<div class="step">✅ Bảng <b>keys</b> — OK</div>';

    /* Tạo bảng deposits */
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS deposits (
            id VARCHAR(50) PRIMARY KEY,
            email VARCHAR(150) NOT NULL,
            amount BIGINT DEFAULT 0,
            status VARCHAR(20) DEFAULT 'pending',
            note TEXT,
            ip VARCHAR(50),
            created_at BIGINT DEFAULT 0,
            approved_at BIGINT DEFAULT 0,
            rejected_at BIGINT DEFAULT 0
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");
    echo '<div class="step">✅ Bảng <b>deposits</b> — OK</div>';

    /* Tạo bảng history */
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS history (
            id INT AUTO_INCREMENT PRIMARY KEY,
            email VARCHAR(150) NOT NULL,
            type VARCHAR(30),
            amount BIGINT DEFAULT 0,
            balance BIGINT DEFAULT 0,
            note VARCHAR(255),
            at BIGINT DEFAULT 0
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");
    echo '<div class="step">✅ Bảng <b>history</b> — OK</div>';

    /* Tạo bảng config */
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS config (
            k VARCHAR(100) PRIMARY KEY,
            v LONGTEXT
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");
    echo '<div class="step">✅ Bảng <b>config</b> — OK</div>';

    /* Tạo admin mặc định */
    $checkAdmin = $pdo->prepare('SELECT id FROM users WHERE email = ?');
    $checkAdmin->execute([ADMIN_EMAIL]);

    if (!$checkAdmin->fetch()) {
        $pdo->prepare('INSERT INTO users (email, password, name, balance, key_expiry, is_admin, ip, last_login, created_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)')
            ->execute([ADMIN_EMAIL, ADMIN_PASS, 'Admin BONSICOLA', 999999999, 9999999999999, 'local', round(microtime(true) * 1000), round(microtime(true) * 1000)]);
        echo '<div class="step">✅ Đã tạo admin: <code>' . ADMIN_EMAIL . '</code> / <code>' . ADMIN_PASS . '</code></div>';
    } else {
        echo '<div class="step">✅ Admin đã tồn tại: <code>' . ADMIN_EMAIL . '</code></div>';
    }

    /* Đếm số bảng */
    $tables = $pdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
    echo '<div class="ok"><b>📊 Tổng: ' . count($tables) . ' bảng</b><br>';
    foreach ($tables as $t) echo '• <code>' . $t . '</code><br>';
    echo '</div>';

    echo '<div style="text-align:center;margin-top:20px">';
    echo '<a href="/" class="btn">🏠 VỀ TRANG CHỦ</a>';
    echo ' <a href="/api/index.php?action=ping" class="btn" style="background:#10b981">🧪 TEST API</a>';
    echo '</div>';

    echo '<p style="text-align:center;margin-top:20px;font-size:12px;color:#94a3b8">⚠️ Sau khi setup xong, nên xoá file này để bảo mật!</p>';

} catch (PDOException $e) {
    echo '<div style="background:#fef2f2;border-left:5px solid #ef4444;padding:16px;border-radius:8px;margin:12px 0">';
    echo '<b>❌ LỖI:</b> ' . htmlspecialchars($e->getMessage());
    echo '<br><br><b>Code:</b> ' . $e->getCode();
    echo '</div>';
    echo '<p><b>Kiểm tra:</b></p>';
    echo '<ul>';
    echo '<li>DB_HOST: <code>' . DB_HOST . '</code></li>';
    echo '<li>DB_NAME: <code>' . DB_NAME . '</code></li>';
    echo '<li>DB_USER: <code>' . DB_USER . '</code></li>';
    echo '</ul>';
}

echo '</div></body></html>';
?>
