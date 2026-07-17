<?php
/**
 * ------------------------------------------------------------------------
 *  پل ارتباطی و ای‌پی‌آی MySQL برای هاست‌های سی‌پنل (cPanel)
 *  پرونده: api.php
 * ------------------------------------------------------------------------
 *  راهنمای راه‌اندازی در cPanel:
 *  ۱. وارد کنترل پنل هاست خود (cPanel) شوید.
 *  ۲. از بخش "Databases"، گزینه "MySQL® Databases" را انتخاب کنید.
 *  ۳. یک دیتابیس جدید بسازید (به عنوان مثال: username_birthday).
 *  ۴. یک کاربر جدید دیتابیس بسازید و رمز عبور قوی برای آن انتخاب کنید.
 *  ۵. کاربر ساخته‌شده را به دیتابیس متصل کنید و دسترسی کامل (ALL PRIVILEGES) بدهید.
 *  ۶. مشخصات دیتابیس ساخته‌شده را در بخش ثابتهای زیر (DB_USER، DB_PASS و DB_NAME) جایگذاری کنید.
 *  ۷. تمام! جداول و داده‌های اولیه به صورت خودکار در اولین اجرا ساخته می‌شوند.
 * ------------------------------------------------------------------------
 */

// ۱. تنظیم هدرهای CORS برای ارتباط بدون دردسر فرانت‌اند با ای‌پی‌آی
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Admin-Password");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Content-Type: application/json; charset=utf-8");

// پاسخ به درخواست‌های پیش‌پرواز (Preflight) مرورگر
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// غیرفعال کردن گزارش مستقیم خطاهای خام mysqli برای جلوگیری از به هم ریختن خروجی JSON
mysqli_report(MYSQLI_REPORT_OFF);

// ۲. مشخصات و اطلاعات اتصال به دیتابیس
define('DB_HOST', 'localhost');
define('DB_USER', 'root');              // نام کاربری دیتابیس در سی‌پنل
define('DB_PASS', '');                  // کلمه عبور دیتابیس در سی‌پنل
define('DB_NAME', 'mahshid_birthday');  // نام دیتابیس ساخته شده در سی‌پنل

// ۳. برقراری ارتباط با سرور دیتابیس
$conn = @new mysqli(DB_HOST, DB_USER, DB_PASS);

if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'ارتباط با سرور MySQL برقرار نشد: ' . $conn->connect_error
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// تلاش برای انتخاب دیتابیس، در صورت عدم وجود تلاش برای ایجاد آن
$db_selected = $conn->select_db(DB_NAME);
if (!$db_selected) {
    $sql_create_db = "CREATE DATABASE IF NOT EXISTS `" . DB_NAME . "` CHARACTER SET utf8mb4 COLLATE utf8mb4_persian_ci";
    if ($conn->query($sql_create_db)) {
        $conn->select_db(DB_NAME);
    } else {
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'message' => 'امکان انتخاب یا ساخت خودکار دیتابیس وجود ندارد. لطفا دیتابیس را دستی در سی‌پنل بسازید و نام آن را در این فایل ویرایش کنید.'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
}

// تنظیم کاراکترست یکپارچه برای پشتیبانی کامل از متون و ایموجی‌های فارسی
$conn->set_charset("utf8mb4");

// ۴. ایجاد جداول مورد نیاز در صورت عدم وجود (کاربر نیازی به ایمپورت دستی SQL ندارد)
$queries = [];

$queries['wishes'] = "CREATE TABLE IF NOT EXISTS `wishes` (
    `id` VARCHAR(50) PRIMARY KEY,
    `sender` VARCHAR(255) NOT NULL,
    `text` TEXT NOT NULL,
    `color` VARCHAR(50) DEFAULT 'rose',
    `timestamp` BIGINT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_persian_ci";

$queries['songs'] = "CREATE TABLE IF NOT EXISTS `songs` (
    `id` VARCHAR(50) PRIMARY KEY,
    `title` VARCHAR(255) NOT NULL,
    `artist` VARCHAR(255) NOT NULL,
    `url` VARCHAR(255) NOT NULL,
    `isCustom` TINYINT(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_persian_ci";

$queries['settings'] = "CREATE TABLE IF NOT EXISTS `settings` (
    `setting_key` VARCHAR(50) PRIMARY KEY,
    `setting_value` TEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_persian_ci";

foreach ($queries as $tableName => $sql) {
    if (!$conn->query($sql)) {
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'message' => "خطا در بررسی یا ایجاد جدول $tableName: " . $conn->error
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
}

// ایجاد خودکار پوشه‌های آپلود در هاست برای راحتی کار
$uploads_dir = __DIR__ . '/uploads';
$songs_dir = $uploads_dir . '/songs';
$photos_dir = $uploads_dir . '/photos';

if (!is_dir($uploads_dir)) @mkdir($uploads_dir, 0755, true);
if (!is_dir($songs_dir)) @mkdir($songs_dir, 0755, true);
if (!is_dir($photos_dir)) @mkdir($photos_dir, 0755, true);

// ۵. پیش‌کاشت (Seeding) داده‌های اولیه برای شروع کار دیتابیس تازه متولد شده
// کاشت رمز عبور مدیریت پیش‌فرض
$res = $conn->query("SELECT COUNT(*) as count FROM `settings` WHERE `setting_key` = 'adminPassword'");
$row = $res->fetch_assoc();
if ($row['count'] == 0) {
    $stmt = $conn->prepare("INSERT INTO `settings` (`setting_key`, `setting_value`) VALUES ('adminPassword', ?)");
    $default_pw = "1385";
    $stmt->bind_param("s", $default_pw);
    $stmt->execute();
    $stmt->close();
}

// خواندن رمز عبور مدیریت از دیتابیس
$admin_password_from_db = '1385';
$res_pw = $conn->query("SELECT `setting_value` FROM `settings` WHERE `setting_key` = 'adminPassword'");
if ($res_pw && $row_pw = $res_pw->fetch_assoc()) {
    $admin_password_from_db = trim($row_pw['setting_value']);
}
define('ADMIN_PASSWORD', $admin_password_from_db);

// کاشت تصویر فعال
$res = $conn->query("SELECT COUNT(*) as count FROM `settings` WHERE `setting_key` = 'activePhoto'");
$row = $res->fetch_assoc();
if ($row['count'] == 0) {
    $stmt = $conn->prepare("INSERT INTO `settings` (`setting_key`, `setting_value`) VALUES ('activePhoto', ?)");
    $default_photo = "/src/assets/images/mahshid_avatar_1784284797850.jpg";
    $stmt->bind_param("s", $default_photo);
    $stmt->execute();
    $stmt->close();
}

// کاشت لیست موسیقی‌ها
$res = $conn->query("SELECT COUNT(*) as count FROM `songs`");
$row = $res->fetch_assoc();
if ($row['count'] == 0) {
    $default_songs = [];
    $stmt = $conn->prepare("INSERT INTO `songs` (`id`, `title`, `artist`, `url`, `isCustom`) VALUES (?, ?, ?, ?, ?)");
    foreach ($default_songs as $song) {
        $stmt->bind_param("ssssi", $song['id'], $song['title'], $song['artist'], $song['url'], $song['isCustom']);
        $stmt->execute();
    }
    $stmt->close();
}

// کاشت تبریک‌های اولیه
$res = $conn->query("SELECT COUNT(*) as count FROM `wishes`");
$row = $res->fetch_assoc();
if ($row['count'] == 0) {
    $default_wishes = [
        [
            "id" => "w-1",
            "sender" => "یک همراه قدیمی",
            "text" => "مهشید مهران و باوقار، میلادت فرخنده باد. مرسی که با آمدنت دنیا رو زیباتر و پر از حس زنده بودن کردی 😍💖",
            "color" => "rose",
            "timestamp" => 1784280840599
        ],
        [
            "id" => "w-2",
            "sender" => "رازِ شب‌های روشن",
            "text" => "تولدت مبارک تماشایی‌ترین ستاره‌ی امشب! آرزو می‌کنم چشمانت همیشه از شادی برق بزند و قلبت پناهگاهِ زیباترین احساس‌ها باشد 💕✨",
            "color" => "pink",
            "timestamp" => 1784284440599
        ],
        [
            "id" => "w-3",
            "sender" => "نسیم بهاری",
            "text" => "لطیف‌ترین و رویایی‌ترین تولد تقدیم به مهشید دوست‌داشتنی. جهان به وجود انسان‌های نابی چون تو افتخار می‌کنه 🌸✨",
            "color" => "fuchsia",
            "timestamp" => 1784286240599
        ]
    ];
    $stmt = $conn->prepare("INSERT INTO `wishes` (`id`, `sender`, `text`, `color`, `timestamp`) VALUES (?, ?, ?, ?, ?)");
    foreach ($default_wishes as $wish) {
        $stmt->bind_param("ssssi", $wish['id'], $wish['sender'], $wish['text'], $wish['color'], $wish['timestamp']);
        $stmt->execute();
    }
    $stmt->close();
}


// ۶. بررسی هویت مدیر برای کارهای حساس (مانند بارگذاری آهنگ و تصویر)
function getallheaders_custom() {
    $headers = [];
    if (function_exists('getallheaders')) {
        foreach (getallheaders() as $key => $val) {
            $headers[strtolower($key)] = $val;
        }
    }
    // بازیابی به عنوان پشتیبان از متغیرهای سرور در محیط‌های مختلف مانند Nginx یا FastCGI
    foreach ($_SERVER as $name => $value) {
        if (substr($name, 0, 5) == 'HTTP_') {
            $key = str_replace(' ', '-', strtolower(str_replace('_', ' ', substr($name, 5))));
            $headers[$key] = $value;
        }
    }
    return $headers;
}

function checkAdminAuth() {
    $headers = getallheaders_custom();
    $password = '';

    if (isset($headers['authorization'])) {
        $authHeader = $headers['authorization'];
        if (strpos($authHeader, 'Bearer ') === 0) {
            $password = substr($authHeader, 7);
        }
    } elseif (isset($headers['x-admin-password'])) {
        $password = $headers['x-admin-password'];
    }

    if ($password === ADMIN_PASSWORD) {
        return true;
    }

    http_response_code(401);
    echo json_encode([
        'status' => 'error',
        'message' => 'کلمه عبور ورود مدیریت اشتباه است'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// ۷. روتر اکشن‌های ای‌پی‌آی بر اساس پارامتر GET action
$action = isset($_GET['action']) ? $_GET['action'] : 'get_all';

switch ($action) {
    case 'status':
        // بررسی سلامت اتصال ای‌پی‌آی و دیتابیس
        echo json_encode([
            'status' => 'ok',
            'database' => 'connected',
            'time' => time(),
            'php_version' => phpversion()
        ], JSON_UNESCAPED_UNICODE);
        break;

    case 'verify_admin':
        // بررسی صحت پس‌کد ادمین
        checkAdminAuth();
        echo json_encode([
            'status' => 'success',
            'message' => 'احراز هویت با موفقیت انجام شد'
        ], JSON_UNESCAPED_UNICODE);
        break;

    case 'get_all':
    case 'state':
        // بازیابی کل وضعیت اپلیکیشن به صورت یکجا
        $songs = [];
        $result = $conn->query("SELECT * FROM `songs` ORDER BY `isCustom` DESC, `id` DESC");
        while ($row = $result->fetch_assoc()) {
            $row['isCustom'] = (bool)$row['isCustom'];
            $songs[] = $row;
        }

        $wishes = [];
        $result = $conn->query("SELECT * FROM `wishes` ORDER BY `timestamp` DESC");
        while ($row = $result->fetch_assoc()) {
            $row['timestamp'] = (float)$row['timestamp'];
            $wishes[] = $row;
        }

        $activePhoto = "/src/assets/images/mahshid_avatar_1784284797850.jpg";
        $result = $conn->query("SELECT `setting_value` FROM `settings` WHERE `setting_key` = 'activePhoto'");
        if ($row = $result->fetch_assoc()) {
            $activePhoto = $row['setting_value'];
        }

        echo json_encode([
            'activePhoto' => $activePhoto,
            'songs' => $songs,
            'wishes' => $wishes
        ], JSON_UNESCAPED_UNICODE);
        break;

    case 'get_wishes':
        // دریافت تبریک‌ها به تنهایی
        $wishes = [];
        $result = $conn->query("SELECT * FROM `wishes` ORDER BY `timestamp` DESC");
        while ($row = $result->fetch_assoc()) {
            $row['timestamp'] = (float)$row['timestamp'];
            $wishes[] = $row;
        }
        echo json_encode($wishes, JSON_UNESCAPED_UNICODE);
        break;

    case 'get_songs':
        // دریافت موزیک‌ها به تنهایی
        $songs = [];
        $result = $conn->query("SELECT * FROM `songs` ORDER BY `isCustom` DESC, `id` DESC");
        while ($row = $result->fetch_assoc()) {
            $row['isCustom'] = (bool)$row['isCustom'];
            $songs[] = $row;
        }
        echo json_encode($songs, JSON_UNESCAPED_UNICODE);
        break;

    case 'add_wish':
        // اضافه کردن یک آرزوی تبریک جدید
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405);
            echo json_encode(['status' => 'error', 'message' => 'فقط متد POST پشتیبانی می‌شود'], JSON_UNESCAPED_UNICODE);
            exit;
        }

        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input) {
            $input = $_POST;
        }

        $sender = isset($input['sender']) ? trim($input['sender']) : '';
        $text = isset($input['text']) ? trim($input['text']) : '';
        $color = isset($input['color']) ? trim($input['color']) : 'rose';

        if (empty($sender) || empty($text)) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'ارسال نام فرستنده و متن الزامی است'], JSON_UNESCAPED_UNICODE);
            exit;
        }

        $id = 'wish-' . round(microtime(true) * 1000);
        $timestamp = round(microtime(true) * 1000);

        $stmt = $conn->prepare("INSERT INTO `wishes` (`id`, `sender`, `text`, `color`, `timestamp`) VALUES (?, ?, ?, ?, ?)");
        $stmt->bind_param("ssssi", $id, $sender, $text, $color, $timestamp);
        
        if ($stmt->execute()) {
            $stmt->close();
            // برگرداندن لیست بروز شده
            $wishes = [];
            $result = $conn->query("SELECT * FROM `wishes` ORDER BY `timestamp` DESC");
            while ($row = $result->fetch_assoc()) {
                $row['timestamp'] = (float)$row['timestamp'];
                $wishes[] = $row;
            }
            echo json_encode($wishes, JSON_UNESCAPED_UNICODE);
        } else {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => 'خطا در ثبت آرزو: ' . $conn->error], JSON_UNESCAPED_UNICODE);
        }
        break;

    case 'upload_song':
        // بارگذاری فایل صوتی جدید توسط مدیر
        checkAdminAuth();

        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405);
            echo json_encode(['status' => 'error', 'message' => 'فقط متد POST مجاز است'], JSON_UNESCAPED_UNICODE);
            exit;
        }

        if (!isset($_FILES['audio'])) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'فایل صوتی یافت نشد'], JSON_UNESCAPED_UNICODE);
            exit;
        }

        $title = isset($_POST['title']) ? trim($_POST['title']) : '';
        $artist = isset($_POST['artist']) ? trim($_POST['artist']) : 'موزیک بارگذاری شده 🎧';

        $file = $_FILES['audio'];
        $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        
        if ($ext !== 'mp3' && $ext !== 'wav') {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'فقط فرمت‌های صوتی MP3 و WAV مجاز می‌باشند'], JSON_UNESCAPED_UNICODE);
            exit;
        }

        $filename = 'song_' . uniqid() . '.' . $ext;
        $target_path = $songs_dir . '/' . $filename;

        if (move_uploaded_file($file['tmp_name'], $target_path)) {
            $id = 'custom-' . round(microtime(true) * 1000);
            if (empty($title)) {
                $title = pathinfo($file['name'], PATHINFO_FILENAME);
            }
            $fileUrl = '/uploads/songs/' . $filename;
            $isCustom = 1;

            $stmt = $conn->prepare("INSERT INTO `songs` (`id`, `title`, `artist`, `url`, `isCustom`) VALUES (?, ?, ?, ?, ?)");
            $stmt->bind_param("ssssi", $id, $title, $artist, $fileUrl, $isCustom);
            $stmt->execute();
            $stmt->close();

            // برگرداندن لیست بروز شده کل آهنگ‌ها
            $songs = [];
            $result = $conn->query("SELECT * FROM `songs` ORDER BY `isCustom` DESC, `id` DESC");
            while ($row = $result->fetch_assoc()) {
                $row['isCustom'] = (bool)$row['isCustom'];
                $songs[] = $row;
            }
            echo json_encode($songs, JSON_UNESCAPED_UNICODE);
        } else {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => 'خطا در انتقال فایل صوتی به سرور'], JSON_UNESCAPED_UNICODE);
        }
        break;

    case 'upload_photo':
        // بارگذاری تصویر فعال ادمین
        checkAdminAuth();

        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405);
            echo json_encode(['status' => 'error', 'message' => 'فقط متد POST مجاز است'], JSON_UNESCAPED_UNICODE);
            exit;
        }

        if (!isset($_FILES['photo'])) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'فایل تصویر یافت نشد'], JSON_UNESCAPED_UNICODE);
            exit;
        }

        $file = $_FILES['photo'];
        $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        $allowed_exts = ['jpg', 'jpeg', 'png', 'webp', 'gif'];

        if (!in_array($ext, $allowed_exts)) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'فرمت تصویر نامعتبر است (فرمت‌های مجاز: JPG, PNG, WEBP, GIF)'], JSON_UNESCAPED_UNICODE);
            exit;
        }

        $filename = 'photo_' . uniqid() . '.' . $ext;
        $target_path = $photos_dir . '/' . $filename;

        if (move_uploaded_file($file['tmp_name'], $target_path)) {
            $fileUrl = '/uploads/photos/' . $filename;
            
            $stmt = $conn->prepare("INSERT INTO `settings` (`setting_key`, `setting_value`) VALUES ('activePhoto', ?) ON DUPLICATE KEY UPDATE `setting_value` = VALUES(`setting_value`)");
            $stmt->bind_param("s", $fileUrl);
            $stmt->execute();
            $stmt->close();

            echo json_encode(['activePhoto' => $fileUrl], JSON_UNESCAPED_UNICODE);
        } else {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => 'خطا در ذخیره‌سازی فایل تصویر'], JSON_UNESCAPED_UNICODE);
        }
        break;

    case 'reset_photo':
        // ریست کردن تصویر فعال به تصویر پیش‌فرض مهشید
        checkAdminAuth();

        $default_photo = "/src/assets/images/mahshid_avatar_1784284797850.jpg";
        $stmt = $conn->prepare("INSERT INTO `settings` (`setting_key`, `setting_value`) VALUES ('activePhoto', ?) ON DUPLICATE KEY UPDATE `setting_value` = VALUES(`setting_value`)");
        $stmt->bind_param("s", $default_photo);
        $stmt->execute();
        $stmt->close();

        echo json_encode(['activePhoto' => $default_photo], JSON_UNESCAPED_UNICODE);
        break;

    case 'delete_song':
        checkAdminAuth();
        $id = isset($_GET['id']) ? trim($_GET['id']) : '';
        if (!empty($id)) {
            $stmt = $conn->prepare("DELETE FROM `songs` WHERE `id` = ?");
            $stmt->bind_param("s", $id);
            $stmt->execute();
            $stmt->close();
        }
        
        $songs = [];
        $result = $conn->query("SELECT * FROM `songs` ORDER BY `isCustom` DESC, `id` DESC");
        while ($row = $result->fetch_assoc()) {
            $row['isCustom'] = (bool)$row['isCustom'];
            $songs[] = $row;
        }
        echo json_encode($songs, JSON_UNESCAPED_UNICODE);
        break;

    case 'delete_wish':
        checkAdminAuth();
        $id = isset($_GET['id']) ? trim($_GET['id']) : '';
        if (!empty($id)) {
            $stmt = $conn->prepare("DELETE FROM `wishes` WHERE `id` = ?");
            $stmt->bind_param("s", $id);
            $stmt->execute();
            $stmt->close();
        }
        
        $wishes = [];
        $result = $conn->query("SELECT * FROM `wishes` ORDER BY `timestamp` DESC");
        while ($row = $result->fetch_assoc()) {
            $row['timestamp'] = (float)$row['timestamp'];
            $wishes[] = $row;
        }
        echo json_encode($wishes, JSON_UNESCAPED_UNICODE);
        break;

    case 'sync_all':
        // همگام‌سازی دوطرفه تراکنشی برای کارکرد آفلاین/محلی محکم و بی نقص
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405);
            echo json_encode(['status' => 'error', 'message' => 'فقط متد POST پشتیبانی می‌شود'], JSON_UNESCAPED_UNICODE);
            exit;
        }

        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'بدنه درخواست JSON نامعتبر است'], JSON_UNESCAPED_UNICODE);
            exit;
        }

        // آغاز تراکنش مطمئن برای تضمین داده‌ها (COMMIT & ROLLBACK)
        $conn->begin_transaction();

        try {
            // ۱. بروزرسانی تصویر فعال در صورت وجود در ورودی
            if (isset($input['activePhoto'])) {
                $stmt = $conn->prepare("INSERT INTO `settings` (`setting_key`, `setting_value`) VALUES ('activePhoto', ?) ON DUPLICATE KEY UPDATE `setting_value` = VALUES(`setting_value`)");
                $stmt->bind_param("s", $input['activePhoto']);
                $stmt->execute();
                $stmt->close();
            }

            // ۲. همگام‌سازی آهنگ‌ها در صورت وجود
            if (isset($input['songs']) && is_array($input['songs'])) {
                $stmt = $conn->prepare("INSERT INTO `songs` (`id`, `title`, `artist`, `url`, `isCustom`) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE `title` = VALUES(`title`), `artist` = VALUES(`artist`), `url` = VALUES(`url`), `isCustom` = VALUES(`isCustom`)");
                foreach ($input['songs'] as $song) {
                    $songId = isset($song['id']) ? $song['id'] : uniqid('song-');
                    $songTitle = isset($song['title']) ? $song['title'] : 'نامعلوم';
                    $songArtist = isset($song['artist']) ? $song['artist'] : 'نامعلوم';
                    $songUrl = isset($song['url']) ? $song['url'] : '';
                    $songIsCustom = isset($song['isCustom']) ? (int)$song['isCustom'] : 0;

                    $stmt->bind_param("ssssi", $songId, $songTitle, $songArtist, $songUrl, $songIsCustom);
                    $stmt->execute();
                }
                $stmt->close();
            }

            // ۳. همگام‌سازی آرزوها در صورت وجود
            if (isset($input['wishes']) && is_array($input['wishes'])) {
                $stmt = $conn->prepare("INSERT INTO `wishes` (`id`, `sender`, `text`, `color`, `timestamp`) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE `sender` = VALUES(`sender`), `text` = VALUES(`text`), `color` = VALUES(`color`), `timestamp` = VALUES(`timestamp`)");
                foreach ($input['wishes'] as $wish) {
                    $wishId = isset($wish['id']) ? $wish['id'] : uniqid('wish-');
                    $wishSender = isset($wish['sender']) ? $wish['sender'] : 'ناشناس';
                    $wishText = isset($wish['text']) ? $wish['text'] : '';
                    $wishColor = isset($wish['color']) ? $wish['color'] : 'rose';
                    $wishTimestamp = isset($wish['timestamp']) ? (float)$wish['timestamp'] : (time() * 1000);

                    $stmt->bind_param("ssssi", $wishId, $wishSender, $wishText, $wishColor, $wishTimestamp);
                    $stmt->execute();
                }
                $stmt->close();
            }

            // تایید نهایی تراکنش
            $conn->commit();

            // بازیابی وضعیت جدید نهایی برای برگرداندن به کلاینت
            $songs = [];
            $result = $conn->query("SELECT * FROM `songs` ORDER BY `isCustom` DESC, `id` DESC");
            while ($row = $result->fetch_assoc()) {
                $row['isCustom'] = (bool)$row['isCustom'];
                $songs[] = $row;
            }

            $wishes = [];
            $result = $conn->query("SELECT * FROM `wishes` ORDER BY `timestamp` DESC");
            while ($row = $result->fetch_assoc()) {
                $row['timestamp'] = (float)$row['timestamp'];
                $wishes[] = $row;
            }

            $activePhoto = "/src/assets/images/mahshid_avatar_1784284797850.jpg";
            $result = $conn->query("SELECT `setting_value` FROM `settings` WHERE `setting_key` = 'activePhoto'");
            if ($row = $result->fetch_assoc()) {
                $activePhoto = $row['setting_value'];
            }

            echo json_encode([
                'status' => 'success',
                'message' => 'همگام‌سازی دوطرفه تراکنشی با موفقیت انجام شد',
                'state' => [
                    'activePhoto' => $activePhoto,
                    'songs' => $songs,
                    'wishes' => $wishes
                ]
            ], JSON_UNESCAPED_UNICODE);

        } catch (Exception $e) {
            // در صورت بروز هرگونه خطا کل عملیات لغو می‌شود تا داده‌ها خراب نشوند
            $conn->rollback();
            http_response_code(500);
            echo json_encode([
                'status' => 'error',
                'message' => 'خطا در ثبت تراکنش پایگاه داده: ' . $e->getMessage()
            ], JSON_UNESCAPED_UNICODE);
        }
        break;

    default:
        http_response_code(400);
        echo json_encode([
            'status' => 'error',
            'message' => 'اکشن درخواستی نامعتبر است'
        ], JSON_UNESCAPED_UNICODE);
        break;
}

// بستن ایمن اتصال دیتابیس
$conn->close();
