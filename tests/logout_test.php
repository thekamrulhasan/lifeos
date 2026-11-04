<?php

declare(strict_types=1);

// Test the actual endpoint over HTTP with disposable sessions, without a database.
$directory = sys_get_temp_dir() . '/lifeos_logout_' . bin2hex(random_bytes(6));
mkdir($directory);
$auth = var_export(dirname(__DIR__) . '/auth.php', true);
$responses = var_export(dirname(__DIR__) . '/lib/api_response.php', true);
$logout = var_export(dirname(__DIR__) . '/logout.php', true);
$sessions = var_export($directory, true);
$router = <<<PHP
<?php
ini_set('session.save_path', $sessions);
require_once $auth;
require_once $responses;
if (parse_url(\$_SERVER['REQUEST_URI'], PHP_URL_PATH) === '/logout.php') require $logout;
if (\$_SERVER['REQUEST_URI'] === '/csrf-return') {
    life_os_require_csrf(fn () => header('X-CSRF-Callback: invoked'));
}
if (\$_SERVER['REQUEST_URI'] === '/csrf-throw') {
    try {
        life_os_require_csrf(fn () => throw new ApiException(403, 'invalid_request_token', 'Reload before saving.'));
    } catch (ApiException \$error) {
        api_error(\$error->status, \$error->errorCode, \$error->getMessage());
    }
}
if (\$_SERVER['REQUEST_URI'] === '/csrf-custom') {
    life_os_require_csrf(function () {
        http_response_code(403);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Invalid request token']);
        exit;
    });
}
life_os_start_session();
header('Content-Type: application/json');
if (\$_SERVER['REQUEST_URI'] === '/seed') {
    \$_SESSION['life_os_authenticated'] = true;
    \$_SESSION['state_csrf'] = bin2hex(random_bytes(32));
}
echo json_encode(['authenticated' => \$_SESSION['life_os_authenticated'] ?? false, 'csrf' => \$_SESSION['state_csrf'] ?? null]);
PHP;
file_put_contents($directory . '/router.php', $router);
$socket = stream_socket_server('tcp://127.0.0.1:0');
if (!$socket) throw new RuntimeException('Cannot allocate test port.');
$address = stream_socket_get_name($socket, false);
fclose($socket);
$process = proc_open([PHP_BINARY, '-S', $address, $directory . '/router.php'], [
    0 => ['pipe', 'r'], 1 => ['file', $directory . '/server.log', 'a'], 2 => ['file', $directory . '/server.log', 'a'],
], $pipes, $directory);
if (!is_resource($process)) throw new RuntimeException('Cannot start test server.');
$checks = 0;
function check(bool $condition, string $message): void
{
    global $checks;
    if (!$condition) throw new RuntimeException($message);
    $checks++;
}
function request(string $path, string $method = 'GET', array $headers = []): array
{
    global $address;
    $context = stream_context_create(['http' => [
        'method' => $method, 'header' => implode("\r\n", $headers),
        'ignore_errors' => true, 'follow_location' => 0, 'timeout' => 3,
    ]]);
    $response = fopen('http://' . $address . $path, 'r', false, $context);
    if (!$response) throw new RuntimeException('Test request failed.');
    $responseHeaders = stream_get_meta_data($response)['wrapper_data'];
    $body = stream_get_contents($response);
    fclose($response);
    preg_match('/\s(\d{3})\s/', $responseHeaders[0], $match);
    return [(int) $match[1], $responseHeaders, $body];
}
try {
    fclose($pipes[0]);
    for ($attempt = 0; $attempt < 100; $attempt++) {
        $ready = @stream_socket_client('tcp://' . $address, $errorCode, $errorMessage, .1);
        if ($ready) { fclose($ready); break; }
        usleep(20000);
    }
    [$status, $headers, $body] = request('/seed');
    check($status === 200, 'Session fixture starts.');
    preg_match('/^Set-Cookie: ([^;]+)/mi', implode("\n", $headers), $cookieMatch);
    $cookie = 'Cookie: ' . $cookieMatch[1];
    $csrf = json_decode($body, true)['csrf'];
    foreach (['/csrf-return', '/csrf-throw', '/csrf-custom'] as $path) {
        foreach ([[$cookie], [$cookie, 'X-CSRF-Token: wrong-token'], ['X-CSRF-Token: ' . $csrf]] as $invalidHeaders) {
            [$status, $headers, $body] = request($path, 'POST', $invalidHeaders);
            check($status === 403, 'Callbacks reject missing, incorrect and cross-session tokens.');
            $error = json_decode($body, true)['error'];
            if ($path === '/csrf-return') check(in_array('X-CSRF-Callback: invoked', $headers, true) && is_string($error), 'A returning callback cannot bypass CSRF validation.');
            if ($path === '/csrf-throw') check($error['code'] === 'invalid_request_token' && $error['message'] === 'Reload before saving.', 'An exception callback preserves the structured API error.');
            if ($path === '/csrf-custom') check($error === 'Invalid request token', 'Custom string error responses are preserved.');
        }
        [$status, $headers] = request($path, 'POST', [$cookie, 'X-CSRF-Token: ' . $csrf]);
        check($status === 200 && !in_array('X-CSRF-Callback: invoked', $headers, true), 'Valid CSRF tokens pass without invoking the rejection callback.');
    }
    foreach (['GET', 'HEAD', 'PUT', 'DELETE'] as $method) {
        [$status, $headers] = request('/logout.php', $method, [$cookie, 'X-CSRF-Token: ' . $csrf]);
        check($status === 405 && in_array('Allow: POST', $headers, true), "$method is rejected.");
    }
    foreach ([[], ['X-CSRF-Token: wrong-token']] as $tokenHeaders) {
        [$status] = request('/logout.php', 'POST', array_merge([$cookie], $tokenHeaders));
        check($status === 403, 'Missing or invalid CSRF token is rejected.');
    }
    [, , $body] = request('/inspect', 'GET', [$cookie]);
    check(json_decode($body, true)['authenticated'] === true, 'Rejected requests preserve authentication.');
    [$status] = request('/logout.php', 'POST', ['X-CSRF-Token: ' . $csrf]);
    check($status === 403, 'A token without its session cookie is rejected.');
    [$status, $headers, $body] = request('/logout.php', 'POST', [$cookie, 'X-CSRF-Token: ' . $csrf, 'Accept: application/json']);
    check($status === 200 && json_decode($body, true)['ok'] === true, 'Valid JSON logout succeeds.');
    check((bool) preg_grep('/^Set-Cookie: edi_life_os=deleted;/', $headers), 'Logout expires the session cookie.');
    [, , $body] = request('/inspect', 'GET', [$cookie]);
    check(json_decode($body, true)['authenticated'] === false, 'The previous session is destroyed.');
    [$status] = request('/logout.php', 'POST', [$cookie, 'X-CSRF-Token: ' . $csrf]);
    check($status === 403, 'A destroyed session cannot reuse its token.');
    [, $headers, $body] = request('/seed');
    preg_match('/^Set-Cookie: ([^;]+)/mi', implode("\n", $headers), $cookieMatch);
    [$status, $headers] = request('/logout.php', 'POST', ['Cookie: ' . $cookieMatch[1], 'X-CSRF-Token: ' . json_decode($body, true)['csrf']]);
    check($status === 303 && in_array('Location: /login.php', $headers, true), 'Non-JSON logout redirects with 303.');
    echo "logout_test: $checks checks passed\n";
} finally {
    proc_terminate($process);
    proc_close($process);
    foreach (glob($directory . '/*') as $file) unlink($file);
    rmdir($directory);
}
