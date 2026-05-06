<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'vendus' => [
        'base_url' => env('VENDUS_BASE_URL', 'https://www.vendus.co.ao/ws/v1.1/'),
        'api_key' => env('VENDUS_API_KEY'),
        'register_id' => env('VENDUS_REGISTER_ID'),
        'serie' => env('VENDUS_SERIE'),
        'modo' => env('VENDUS_MODO', 'live'),
        'timeout' => (int) env('VENDUS_TIMEOUT', 20),
        'verify_ssl' => (bool) env('VENDUS_VERIFY_SSL', true),
    ],

];
