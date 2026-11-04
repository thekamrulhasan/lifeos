<?php

require_once __DIR__ . '/auth.php';
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    http_response_code(405);
    header('Allow: POST');
    exit;
}
life_os_require_csrf();
life_os_logout();
header('Cache-Control: no-store');
if (str_contains((string) ($_SERVER['HTTP_ACCEPT'] ?? ''), 'application/json')) {
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['ok' => true]);
    exit;
}
header('Location: /login.php', true, 303);
exit;
