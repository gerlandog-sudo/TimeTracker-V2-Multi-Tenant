<?php

namespace App\Core;

class Response {
    public static function json($data, $status = 200) {
        http_response_code($status);
        echo json_encode($data);
        exit;
    }
    public static function success($msg) { self::json(['message' => $msg]); }
    public static function error($msg, $status = 400) { self::json(['message' => $msg], $status); }
}
