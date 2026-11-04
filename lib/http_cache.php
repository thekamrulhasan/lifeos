<?php
declare(strict_types=1);

function life_os_static_cache(string $extension, array $query): string
{
    if ($extension === 'html') return 'private, no-store';
    if (is_string($query['v'] ?? null) && $query['v'] !== '') return 'private, max-age=31536000, immutable';
    return 'private, max-age=3600';
}
