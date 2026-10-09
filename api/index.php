<?php
require_once __DIR__ . '/config.php';

/* ============================================================
   HELPERS
   ============================================================ */
function input() {
    $raw = file_get_contents('php://input');
    $json = json_decode($raw, true);
    if (is_array($json)) return $json;
    return array_merge($_GET, $_POST);
}
function nowMs() { return round(microtime(true) * 1000); }
function getIP() {
    if (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) return trim(explode(',', $_SERVER['HTTP_X_FORWARDED_FOR'])[0]);
    return $_SERVER['REMOTE_ADDR'] ?? 'unknown';
}
function auth() {
    $in = input();
    $email = strtolower(trim($in['email'] ?? ''));
    $pass = $in['password'] ?? '';
    if (!$email) out(['error' => 'Chưa đăng nhập'], 401);
    $s = db()->prepare('SELECT * FROM users WHERE email = ?');
    $s->execute([$email]);
    $u = $s->fetch();
    if (!$u || $u['password'] !== $pass) out(['error' => 'Sai tài khoản'], 401);
    return $u;
}
function adminOnly() {
    $u = auth();
    if ($u['email'] !== strtolower(ADMIN_EMAIL) && !$u['is_admin']) out(['error' => 'Không có quyền'], 403);
    return $u;
}
function genKey() {
    $C = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    $g = function() use ($C) {
        $s = '';
        for ($i = 0; $i < 4; $i++) $s .= $C[random_int(0, strlen($C) - 1)];
        return $s;
    };
    return $g() . '-' . $g() . '-' . $g();
}

/* ============================================================
   AUTO-CREATE TABLES + AUTO-ADD COLUMNS
   Chạy 1 lần cho mỗi request, an toàn, dùng IF NOT EXISTS
   ============================================================ */
function ensureSchema() {
    static $done = false;
    if ($done) return;
    $done = true;

    try {
        $pdo = db();

        /* ---------- BẢNG USERS ---------- */
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
                created_at BIGINT DEFAULT 0,
                last_api VARCHAR(500) DEFAULT '',
                last_tool VARCHAR(150) DEFAULT '',
                last_tool_at BIGINT DEFAULT 0
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        ");

        /* ---------- BẢNG KEYS ---------- */
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS `keys` (
                id INT AUTO_INCREMENT PRIMARY KEY,
                code VARCHAR(50) UNIQUE NOT NULL,
                days INT DEFAULT 1,
                used TINYINT DEFAULT 0,
                used_by VARCHAR(150),
                note VARCHAR(255) DEFAULT '',
                created_at BIGINT DEFAULT 0,
                used_at BIGINT DEFAULT 0
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        ");

        /* ---------- BẢNG DEPOSITS ---------- */
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS deposits (
                id VARCHAR(50) PRIMARY KEY,
                email VARCHAR(150) NOT NULL,
                amount BIGINT DEFAULT 0,
                method VARCHAR(30) DEFAULT 'bank',
                status VARCHAR(20) DEFAULT 'pending',
                note TEXT,
                ip VARCHAR(50),
                created_at BIGINT DEFAULT 0,
                approved_at BIGINT DEFAULT 0,
                rejected_at BIGINT DEFAULT 0
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        ");

        /* ---------- BẢNG HISTORY ---------- */
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

        /* ---------- BẢNG CONFIG ---------- */
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS config (
                k VARCHAR(100) PRIMARY KEY,
                v LONGTEXT
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        ");

        /* ---------- AUTO-ADD CỘT THIẾU (DB cũ) ---------- */
        $checks = [
            ['users',    'last_api',     "ALTER TABLE users ADD COLUMN last_api VARCHAR(500) DEFAULT ''"],
            ['users',    'last_tool',    "ALTER TABLE users ADD COLUMN last_tool VARCHAR(150) DEFAULT ''"],
            ['users',    'last_tool_at', "ALTER TABLE users ADD COLUMN last_tool_at BIGINT DEFAULT 0"],
            ['keys',     'note',         "ALTER TABLE `keys` ADD COLUMN note VARCHAR(255) DEFAULT ''"],
            ['deposits', 'method',       "ALTER TABLE deposits ADD COLUMN method VARCHAR(30) DEFAULT 'bank'"],
        ];
        foreach ($checks as $c) {
            try {
                $s = $pdo->prepare("SHOW COLUMNS FROM `{$c[0]}` LIKE ?");
                $s->execute([$c[1]]);
                if (!$s->fetch()) $pdo->exec($c[2]);
            } catch (Exception $e) { /* bỏ qua */ }
        }

        /* ---------- TẠO ADMIN MẶC ĐỊNH NẾU CHƯA CÓ ---------- */
        $chk = $pdo->prepare('SELECT id FROM users WHERE email = ?');
        $chk->execute([ADMIN_EMAIL]);
        if (!$chk->fetch()) {
            $pdo->prepare('INSERT INTO users (email, password, name, balance, key_expiry, is_admin, ip, last_login, created_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)')
                ->execute([ADMIN_EMAIL, ADMIN_PASS, 'Admin BONSICOLA', 999999999, 9999999999999, 'local', nowMs(), nowMs()]);
        }

    } catch (Exception $e) {
        /* Không chặn — để router tự xử lý và báo lỗi */
    }
}

/* ============================================================
   ROUTER
   ============================================================ */
$action = $_GET['action'] ?? $_POST['action'] ?? '';
$in = input();

/* Tự tạo bảng trước khi xử lý — trừ ping */
if ($action !== 'ping') ensureSchema();

try {

switch ($action) {

    /* ---------- PING ---------- */
    case 'ping': {
        try {
            db()->query('SELECT 1');
            $tables = db()->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
            out([
                'success' => true,
                'message' => 'API đang chạy',
                'time'    => nowMs(),
                'db'      => 'OK',
                'tables'  => $tables
            ]);
        } catch (Exception $e) {
            out(['success' => false, 'error' => 'DB: ' . $e->getMessage()], 500);
        }
    }

    /* ---------- CONFIG ---------- */
    case 'config_get': {
        try {
            $s = db()->prepare('SELECT v FROM config WHERE k = ?');
            $s->execute(['main']);
            $row = $s->fetch();
            out(['success' => true, 'config' => $row ? json_decode($row['v'], true) : null]);
        } catch (Exception $e) {
            out(['success' => true, 'config' => null]);
        }
    }

    case 'config_save': {
        adminOnly();
        $cfg = $in['config'] ?? null;
        if (!$cfg || !is_array($cfg)) out(['error' => 'Config không hợp lệ']);
        $json = json_encode($cfg, JSON_UNESCAPED_UNICODE);
        db()->prepare('INSERT INTO config (k, v) VALUES (?, ?) ON DUPLICATE KEY UPDATE v = ?')
            ->execute(['main', $json, $json]);
        out(['success' => true]);
    }

    /* ---------- AUTH ---------- */
    case 'register': {
        $em = strtolower(trim($in['email'] ?? ''));
        $pw = $in['password'] ?? '';
        $nm = trim($in['name'] ?? '') ?: explode('@', $em)[0];
        if (!$em || !$pw) out(['error' => 'Vui lòng nhập đầy đủ!']);
        if (!filter_var($em, FILTER_VALIDATE_EMAIL)) out(['error' => 'Email không hợp lệ!']);
        if (strlen($pw) < 6) out(['error' => 'Mật khẩu từ 6 ký tự!']);
        $s = db()->prepare('SELECT id FROM users WHERE email = ?');
        $s->execute([$em]);
        if ($s->fetch()) out(['error' => 'Email đã đăng ký!']);
        db()->prepare('INSERT INTO users (email, password, name, balance, key_expiry, is_admin, ip, last_login, created_at) VALUES (?, ?, ?, 0, 0, 0, ?, ?, ?)')
            ->execute([$em, $pw, $nm, getIP(), nowMs(), nowMs()]);
        out(['success' => true, 'message' => 'Đăng ký thành công']);
    }

    case 'login': {
        $em = strtolower(trim($in['email'] ?? ''));
        $pw = $in['password'] ?? '';
        if (!$em || !$pw) out(['error' => 'Vui lòng nhập đầy đủ!']);
        $s = db()->prepare('SELECT * FROM users WHERE email = ?');
        $s->execute([$em]);
        $u = $s->fetch();
        if (!$u && $em === strtolower(ADMIN_EMAIL) && $pw === ADMIN_PASS) {
            db()->prepare('INSERT INTO users (email, password, name, balance, key_expiry, is_admin, ip, last_login, created_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)')
                ->execute([ADMIN_EMAIL, ADMIN_PASS, 'Admin BONSICOLA', 999999999, 9999999999999, getIP(), nowMs(), nowMs()]);
            $s->execute([$em]);
            $u = $s->fetch();
        }
        if (!$u || $u['password'] !== $pw) out(['error' => 'Sai email hoặc mật khẩu!']);
        if ($em === strtolower(ADMIN_EMAIL)) {
            db()->prepare('UPDATE users SET is_admin = 1 WHERE email = ?')->execute([$em]);
            $u['is_admin'] = 1;
        }
        db()->prepare('UPDATE users SET ip = ?, last_login = ? WHERE email = ?')->execute([getIP(), nowMs(), $em]);
        $u['ip'] = getIP();
        $u['last_login'] = nowMs();
        unset($u['password']);
        out(['success' => true, 'user' => $u]);
    }

    case 'get_user': {
        $u = auth();
        unset($u['password']);
        out(['success' => true, 'user' => $u]);
    }

    /* ---------- DEPOSIT ---------- */
    case 'deposit_create': {
        $u = auth();
        $amount = intval($in['amount'] ?? 0);
        $note = trim($in['note'] ?? '');
        if ($amount < 10000) out(['error' => 'Tối thiểu 10,000đ!']);
        $id = 'dep_' . nowMs() . '_' . bin2hex(random_bytes(3));
        db()->prepare('INSERT INTO deposits (id, email, amount, method, status, note, ip, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
            ->execute([$id, $u['email'], $amount, 'bank', 'pending', $note, getIP(), nowMs()]);
        out(['success' => true, 'id' => $id, 'message' => 'Đã gửi yêu cầu nạp']);
    }

    case 'deposit_pending': {
        adminOnly();
        $s = db()->query("SELECT d.*, u.name AS user_name FROM deposits d LEFT JOIN users u ON d.email=u.email WHERE d.status='pending' ORDER BY d.created_at DESC");
        out(['success' => true, 'deposits' => $s->fetchAll()]);
    }

    case 'deposit_approve': {
        adminOnly();
        $id = $in['id'] ?? '';
        $s = db()->prepare('SELECT * FROM deposits WHERE id = ? AND status = ?');
        $s->execute([$id, 'pending']);
        $d = $s->fetch();
        if (!$d) out(['error' => 'Không tìm thấy']);
        $pdo = db();
        $pdo->beginTransaction();
        try {
            $s = $pdo->prepare('SELECT * FROM users WHERE email = ?');
            $s->execute([$d['email']]);
            $u = $s->fetch();
            if (!$u) throw new Exception('User không tồn tại');
            $newBal = $u['balance'] + $d['amount'];
            $pdo->prepare('UPDATE users SET balance = ? WHERE email = ?')->execute([$newBal, $d['email']]);
            $pdo->prepare('INSERT INTO history (email, type, amount, balance, note, at) VALUES (?, ?, ?, ?, ?, ?)')
                ->execute([$d['email'], 'deposit', $d['amount'], $newBal, 'Nạp tiền', nowMs()]);
            $pdo->prepare('UPDATE deposits SET status=?, approved_at=? WHERE id=?')->execute(['approved', nowMs(), $id]);
            $pdo->commit();
            out(['success' => true, 'new_balance' => $newBal]);
        } catch (Exception $e) {
            $pdo->rollBack();
            out(['error' => $e->getMessage()], 500);
        }
    }

    case 'deposit_reject': {
        adminOnly();
        $id = $in['id'] ?? '';
        $reason = $in['reason'] ?? 'Không hợp lệ';
        db()->prepare('UPDATE deposits SET status=?, rejected_at=?, note=? WHERE id=?')
            ->execute(['rejected', nowMs(), $reason, $id]);
        out(['success' => true]);
    }

    /* ---------- USERS (ADMIN) ---------- */
    case 'user_list': {
        adminOnly();
        $s = db()->query('SELECT id, email, name, balance, key_expiry, is_admin, ip, last_login, created_at FROM users ORDER BY is_admin DESC, last_login DESC');
        out(['success' => true, 'users' => $s->fetchAll()]);
    }

    case 'admin_set_balance': {
        adminOnly();
        $target = strtolower(trim($in['target_email'] ?? ''));
        $delta = intval($in['amount'] ?? 0);
        if (!$target) out(['error' => 'Thiếu email']);
        $s = db()->prepare('SELECT * FROM users WHERE email = ?');
        $s->execute([$target]);
        $u = $s->fetch();
        if (!$u) out(['error' => 'User không tồn tại']);
        $newBal = $u['balance'] + $delta;
        if ($newBal < 0) out(['error' => 'Số dư âm']);
        db()->prepare('UPDATE users SET balance = ? WHERE email = ?')->execute([$newBal, $target]);
        db()->prepare('INSERT INTO history (email, type, amount, balance, note, at) VALUES (?, ?, ?, ?, ?, ?)')
            ->execute([$target, 'admin', $delta, $newBal, 'Admin cấp tiền', nowMs()]);
        out(['success' => true, 'new_balance' => $newBal]);
    }

    case 'user_reset_ip': {
        adminOnly();
        $target = strtolower(trim($in['target_email'] ?? ''));
        db()->prepare('UPDATE users SET ip = ? WHERE email = ?')->execute(['', $target]);
        out(['success' => true]);
    }

    case 'user_delete': {
        adminOnly();
        $target = strtolower(trim($in['target_email'] ?? ''));
        if ($target === strtolower(ADMIN_EMAIL)) out(['error' => 'Không xoá admin']);
        db()->prepare('DELETE FROM users WHERE email = ?')->execute([$target]);
        out(['success' => true]);
    }

    /* ---------- KEYS ---------- */
    case 'key_create': {
        adminOnly();
        $days = max(1, intval($in['days'] ?? 1));
        $qty  = min(100, max(1, intval($in['qty'] ?? 1)));
        $note = trim($in['note'] ?? '');
        $created = [];
        for ($i = 0; $i < $qty; $i++) {
            $code = genKey();
            db()->prepare('INSERT INTO `keys` (code, days, note, created_at) VALUES (?, ?, ?, ?)')
                ->execute([$code, $days, $note, nowMs()]);
            $created[] = $code;
        }
        out(['success' => true, 'keys' => $created]);
    }

    case 'key_activate': {
        $u = auth();
        $code = strtoupper(trim($in['code'] ?? ''));
        if (!$code) out(['error' => 'Nhập key']);
        $s = db()->prepare('SELECT * FROM `keys` WHERE code = ?');
        $s->execute([$code]);
        $k = $s->fetch();
        if (!$k) out(['error' => 'Key sai']);
        if ($k['used']) out(['error' => 'Key đã dùng']);
        $base = ($u['key_expiry'] > nowMs()) ? $u['key_expiry'] : nowMs();
        $newExp = $base + ($k['days'] * 24 * 3600 * 1000);
        $pdo = db();
        $pdo->beginTransaction();
        try {
            $pdo->prepare('UPDATE users SET key_expiry = ? WHERE email = ?')->execute([$newExp, $u['email']]);
            $pdo->prepare('UPDATE `keys` SET used=1, used_by=?, used_at=? WHERE code=?')->execute([$u['email'], nowMs(), $code]);
            $pdo->prepare('INSERT INTO history (email, type, amount, balance, note, at) VALUES (?, ?, 0, ?, ?, ?)')
                ->execute([$u['email'], 'key', $u['balance'], 'Key +' . $k['days'] . 'd', nowMs()]);
            $pdo->commit();
            out(['success' => true, 'days' => $k['days'], 'new_expiry' => $newExp]);
        } catch (Exception $e) {
            $pdo->rollBack();
            out(['error' => $e->getMessage()], 500);
        }
    }

    case 'key_list': {
        adminOnly();
        $s = db()->query('SELECT * FROM `keys` ORDER BY created_at DESC LIMIT 200');
        out(['success' => true, 'keys' => $s->fetchAll()]);
    }

    case 'key_delete': {
        adminOnly();
        db()->prepare('DELETE FROM `keys` WHERE code = ?')->execute([$in['code'] ?? '']);
        out(['success' => true]);
    }

    /* ---------- HISTORY ---------- */
    case 'history': {
        $u = auth();
        $s = db()->prepare('SELECT * FROM history WHERE email = ? ORDER BY at DESC LIMIT 100');
        $s->execute([$u['email']]);
        out(['success' => true, 'history' => $s->fetchAll()]);
    }

    /* ---------- BUY PACKAGE ---------- */
    case 'buy_package': {
        $u = auth();
        $days = intval($in['days'] ?? 0);
        $price = intval($in['price'] ?? 0);
        if ($days < 1 || $price < 1) out(['error' => 'Gói sai']);
        if ($u['balance'] < $price) out(['error' => 'Số dư không đủ']);
        $base = ($u['key_expiry'] > nowMs()) ? $u['key_expiry'] : nowMs();
        $newExp = $base + ($days * 24 * 3600 * 1000);
        $newBal = $u['balance'] - $price;
        $pdo = db();
        $pdo->beginTransaction();
        try {
            $pdo->prepare('UPDATE users SET balance=?, key_expiry=? WHERE email=?')->execute([$newBal, $newExp, $u['email']]);
            $pdo->prepare('INSERT INTO history (email, type, amount, balance, note, at) VALUES (?, ?, ?, ?, ?, ?)')
                ->execute([$u['email'], 'buy', -$price, $newBal, 'Mua VIP ' . $days . 'd', nowMs()]);
            $pdo->commit();
            out(['success' => true, 'new_balance' => $newBal]);
        } catch (Exception $e) {
            $pdo->rollBack();
            out(['error' => $e->getMessage()], 500);
        }
    }

    /* ---------- UPDATE LAST API ---------- */
    case 'update_last_api': {
        $u = auth();
        db()->prepare('UPDATE users SET last_api=?, last_tool=?, last_tool_at=? WHERE email=?')
            ->execute([$in['api'] ?? '', $in['tool'] ?? '', nowMs(), $u['email']]);
        out(['success' => true]);
    }

    /* ---------- DEFAULT ---------- */
    default:
        out(['error' => 'Action không hợp lệ', 'received' => $action], 400);
}

} catch (PDOException $e) {
    out(['error' => 'DB: ' . $e->getMessage(), 'code' => $e->getCode()], 500);
} catch (Exception $e) {
    out(['error' => $e->getMessage()], 500);
} catch (Throwable $e) {
    out(['error' => 'Server: ' . $e->getMessage()], 500);
}
