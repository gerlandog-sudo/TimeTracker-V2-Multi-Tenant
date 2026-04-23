<?php

namespace App\Controllers;

use App\Core\Database;
use App\Core\Response;
use App\Core\Context;
use App\Core\Request;

class UserAlertsController {
    public function getAlerts() {
        try {
            $user = Context::getUser();
            if (!$user) return Response::json([]);
            // La tabla original es "notifications", no "user_alerts"
            return Response::json(Database::fetchAll(
                "SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50",
                [$user['id']]
            ));
        } catch (\Throwable $e) {
            return Response::json([]);
        }
    }

    public function markRead() {
        try {
            $user = Context::getUser();
            if (!$user) return Response::json([]);
            $body = Request::getBody();
            if (isset($body['id'])) {
                Database::query("UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?", [$body['id'], $user['id']]);
            } else {
                Database::query("UPDATE notifications SET is_read = 1 WHERE user_id = ?", [$user['id']]);
            }
            return Response::json(['success' => true]);
        } catch (\Throwable $e) {
            return Response::json(['success' => true]);
        }
    }
}
