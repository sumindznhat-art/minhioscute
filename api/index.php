<?php
require_once __DIR__ . '/config.php';

function input() {
    $raw = file_get_contents('php://input');
    $j = json_decode($raw, true);
    if (is_array($j)) return $j;
    return array_merge($_GET, $_POST);
}
function nowMs() { return round(microtime(true) * 1000); }
function getIP() {
    if (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) return trim(explode(',', $_SERVER['HTTP_X_FORWARDED_FOR'])[0]);
    if (!empty($_SERVER['HTTP_X_REAL_IP'])) return $_SERVER['HTTP_X_REAL_IP'];
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
        $s = ''; for ($i = 0; $i < 4; $i++) $s .= $C[random_int(0, strlen($C) - 1)];
        return $s;
    };
    return $g() . '-' . $g() . '-' . $g();
}

$action = $_GET['action'] ?? $_POST['action'] ?? '';
$in = input();

switch ($action) {

    case 'ping':
        out(['success' => true, 'message' => 'API đang chạy', 'time' => nowMs()]);
        break;

    case 'config_get': {
        try {
            $s = db()->prepare('SELECT v FROM config WHERE k = ?');
            $s->execute(['main']);
            $row = $s->fetch();
            out(['success' => true, 'config' => $row ? json_decode($row['v'], true) : null]);
        } catch (Exception $e) { out(['success' => true, 'config' => null]); }
    }

    case 'config_save': {
        adminOnly();
        $cfg = $in['config'] ?? null;
        if (!$cfg) out(['error' => 'Config không hợp lệ']);
        $json = json_encode($cfg, JSON_UNESCAPED_UNICODE);
        db()->prepare('INSERT INTO config (k, v) VALUES (?, ?) ON DUPLICATE KEY UPDATE v = ?')
            ->execute(['main', $json, $json]);
        out(['success' => true]);
    }

    case 'register': {
        $em = strtolower(trim($in['email'] ?? ''));
        $pw = $in['password'] ?? '';
        $nm = trim($in['name'] ?? '') ?: explode('@', $em)[0];
        if (!$em || !$pw) out(['error' => 'Nhập đầy đủ!']);
        if (!filter_var($em, FILTER_VALIDATE_EMAIL)) out(['error' => 'Email không hợp lệ!']);
        if (strlen($pw) < 6) out(['error' => 'Pass từ 6 ký tự!']);
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
        if (!$em || !$pw) out(['error' => 'Nhập đầy đủ!']);
        $s = db()->prepare('SELECT * FROM users WHERE email = ?');
        $s->execute([$em]);
        $u = $s->fetch();
        if (!$u && $em === strtolower(ADMIN_EMAIL) && $pw === ADMIN_PASS) {
            db()->prepare('INSERT INTO users (email, password, name, balance, key_expiry, is_admin, ip, last_login, created_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)')
                ->execute([ADMIN_EMAIL, ADMIN_PASS, 'Admin', 999999999, 9999999999999, getIP(), nowMs(), nowMs()]);
            $s->execute([$em]);
            $u = $s->fetch();
        }
        if (!$u || $u['password'] !== $pw) out(['error' => 'Sai tài khoản!']);
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

    case 'deposit_create': {
        $u = auth();
        $amount = intval($in['amount'] ?? 0);
        $note = trim($in['note'] ?? '');
        if ($amount < 10000) out(['error' => 'Tối thiểu 10,000đ!']);
        $id = 'dep_' . nowMs() . '_' . bin2hex(random_bytes(3));
        db()->prepare('INSERT INTO deposits (id, email, amount, status, note, ip, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
            ->execute([$id, $u['email'], $amount, 'pending', $note, getIP(), nowMs()]);
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
        } catch (Exception $e) { $pdo->rollBack(); out(['error' => $e->getMessage()], 500); }
    }

    case 'deposit_reject': {
        adminOnly();
        $id = $in['id'] ?? '';
        $reason = $in['reason'] ?? 'Không hợp lệ';
        db()->prepare('UPDATE deposits SET status=?, rejected_at=?, note=? WHERE id=?')->execute(['rejected', nowMs(), $reason, $id]);
        out(['success' => true]);
    }

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

    case 'key_create': {
        adminOnly();
        $days = max(1, intval($in['days'] ?? 1));
        $qty = min(100, max(1, intval($in['qty'] ?? 1)));
        $created = [];
        for ($i = 0; $i < $qty; $i++) {
            $code = genKey();
            db()->prepare('INSERT INTO `keys` (code, days, created_at) VALUES (?, ?, ?)')
                ->execute([$code, $days, nowMs()]);
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
        $pdo->prepare('UPDATE users SET key_expiry = ? WHERE email = ?')->execute([$newExp, $u['email']]);
        $pdo->prepare('UPDATE `keys` SET used=1, used_by=?, used_at=? WHERE code=?')->execute([$u['email'], nowMs(), $code]);
        $pdo->prepare('INSERT INTO history (email, type, amount, balance, note, at) VALUES (?, ?, 0, ?, ?, ?)')->execute([$u['email'], 'key', $u['balance'], 'Key +' . $k['days'] . 'd', nowMs()]);
        $pdo->commit();
        out(['success' => true, 'days' => $k['days'], 'new_expiry' => $newExp]);
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

    case 'history': {
        $u = auth();
        $s = db()->prepare('SELECT * FROM history WHERE email = ? ORDER BY at DESC LIMIT 100');
        $s->execute([$u['email']]);
        out(['success' => true, 'history' => $s->fetchAll()]);
    }

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
        $pdo->prepare('UPDATE users SET balance=?, key_expiry=? WHERE email=?')->execute([$newBal, $newExp, $u['email']]);
        $pdo->prepare('INSERT INTO history (email, type, amount, balance, note, at) VALUES (?, ?, ?, ?, ?, ?)')->execute([$u['email'], 'buy', -$price, $newBal, 'Mua VIP ' . $days . 'd', nowMs()]);
        $pdo->commit();
        out(['success' => true, 'new_balance' => $newBal]);
    }

    case 'update_last_api': {
        $u = auth();
        db()->prepare('UPDATE users SET last_api=?, last_tool=?, last_tool_at=? WHERE email=?')->execute([$in['api'] ?? '', $in['tool'] ?? '', nowMs(), $u['email']]);
        out(['success' => true]);
    }

    default:
        out(['error' => 'Action không hợp lệ', 'received' => $action], 400);
}
?>
