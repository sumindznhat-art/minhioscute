<?php
define('DB_HOST', 'localhost');
define('DB_NAME', 'keclyxbd_bonsicola');
define('DB_USER', 'keclyxbd_admin');
define('DB_PASS', 'Leminh@123456');

define('ADMIN_EMAIL', 'leminhdz@gmail.com');
define('ADMIN_PASS', 'admin123');

date_default_timezone_set('Asia/Ho_Chi_Minh');
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Requested-With');

if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200); exit;
}

error_reporting(E_ALL);
ini_set('display_errors', 0);

function db() {
    static $pdo = null;
    if ($pdo) return $pdo;
    try {
        $pdo = new PDO('mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4', DB_USER, DB_PASS,
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);
        return $pdo;
    } catch (PDOException $e) {
        out(['error' => 'DB: ' . $e->getMessage(), 'code' => $e->getCode()], 500);
    }
}
function out($data, $code = 200) {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

if (basename($_SERVER['SCRIPT_FILENAME'] ?? '') === basename(__FILE__)) {
    try {
        $pdo = new PDO('mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4', DB_USER, DB_PASS);
        $has = $pdo->query("SHOW TABLES LIKE 'users'")->rowCount() > 0;
        echo '<h1 style="color:green;font-family:sans-serif;padding:20px">✅ KẾT NỐI DATABASE THÀNH CÔNG!</h1>';
        echo '<p style="font-family:sans-serif;padding:0 20px"><b>DB:</b> ' . DB_NAME . ' | <b>User:</b> ' . DB_USER . ' | <b>Bảng users:</b> ' . ($has ? '✅ Có' : '❌ Chưa import SQL') . '</p>';
    } catch (PDOException $e) {
        echo '<h1 style="color:red;font-family:sans-serif;padding:20px">❌ LỖI DB: ' . $e->getMessage() . '</h1>';
    }
}
?>
