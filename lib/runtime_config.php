<?php
declare(strict_types=1);

/** Operator settings are independent of the database-backed sign-in account. */
function life_os_setting(string $key, string $environment, mixed $default): mixed
{
    $value = getenv($environment);
    if ($value !== false && $value !== '') return $value;
    if (function_exists('life_os_config')) return life_os_config()[$key] ?? $default;
    return $default;
}

function life_os_timezone(): string
{
    $value = (string) life_os_setting('timezone', 'LIFEOS_TIMEZONE', 'Asia/Tehran');
    if (!in_array($value, DateTimeZone::listIdentifiers(), true)) throw new RuntimeException('Invalid configured timezone.');
    return $value;
}

function life_os_weather_coordinates(): array
{
    $result = [];
    foreach ([['latitude', 'LIFEOS_WEATHER_LATITUDE', 26.9492, 90], ['longitude', 'LIFEOS_WEATHER_LONGITUDE', 56.2691, 180]] as [$key,$environment,$default,$limit]) {
        $value = life_os_setting('weather_' . $key, $environment, $default);
        if (!is_numeric($value) || !is_finite((float) $value) || abs((float) $value) > $limit) throw new RuntimeException('Invalid weather ' . $key . '.');
        $result[$key] = (float) $value;
    }
    return $result;
}
