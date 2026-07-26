<?php

return [
    // JWT secret key
    'key' => env('JWT_KEY', null),

    // Token expiration time in seconds
    'expire' => env('JWT_EXPIRE', 3600),

    // Token issuer
    'issuer' => env('JWT_ISSUER', 'semiconductor-api'),

    // Token audience
    'audience' => env('JWT_AUDIENCE', 'semiconductor-client'),
];