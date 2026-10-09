/* users */
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
echo '<div class="step">✅ Bảng <b>users</b> — OK</div>';

/* keys */
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
echo '<div class="step">✅ Bảng <b>keys</b> — OK</div>';

/* deposits */
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
echo '<div class="step">✅ Bảng <b>deposits</b> — OK</div>';
