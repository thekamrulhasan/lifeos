<?php
declare(strict_types=1);
require_once dirname(__DIR__) . '/auth.php';
$checks = 0;
function check(bool $value, string $label): void {
    global $checks; if (!$value) throw new RuntimeException($label); $checks++;
}
try {
    $_SERVER = ['REMOTE_ADDR' => '127.0.0.1', 'HTTP_X_FORWARDED_PROTO' => 'https', 'HTTP_X_FORWARDED_FOR' => '192.0.2.1, 198.51.100.2'];
    putenv('LIFEOS_TRUST_PROXY=false');
    check(!life_os_is_https(), 'Untrusted forwarded HTTPS ignored');
    check(life_os_client_ip() === '127.0.0.1', 'Untrusted forwarded IP ignored');
    $_SERVER['HTTPS'] = 'on';
    check(life_os_is_https(), 'Direct HTTPS works');
    $_SERVER['HTTPS'] = 'off';
    putenv('LIFEOS_TRUST_PROXY=true');
    check(life_os_is_https(), 'Trusted forwarded HTTPS works');
    check(life_os_client_ip() === '198.51.100.2', 'Trusted last proxy hop selected');
    foreach (['http', 'https,http', '', 'garbage'] as $value) {
        $_SERVER['HTTP_X_FORWARDED_PROTO'] = $value;
        check(!life_os_is_https(), 'Invalid forwarded protocol rejected');
    }
    $_SERVER['HTTP_X_FORWARDED_PROTO'] = 'HTTPS';
    check(life_os_is_https(), 'Protocol case accepted');
    foreach (['bad', '192.0.2.1, bad', ''] as $value) {
        $_SERVER['HTTP_X_FORWARDED_FOR'] = $value;
        check(life_os_client_ip() === '127.0.0.1', 'Invalid last hop falls back');
    }
    $_SERVER['HTTP_X_FORWARDED_FOR'] = '2001:db8::1';
    check(life_os_client_ip() === '2001:db8::1', 'IPv6 client accepted');
    unset($_SERVER['REMOTE_ADDR'], $_SERVER['HTTP_X_FORWARDED_FOR']);
    check(life_os_client_ip() === '', 'Missing address remains empty');
    echo "Passed $checks proxy checks\n";
} finally { putenv('LIFEOS_TRUST_PROXY'); }
