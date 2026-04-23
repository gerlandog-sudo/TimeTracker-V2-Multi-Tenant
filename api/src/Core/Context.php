<?php

namespace App\Core;

class Context {
    private static $user = null;
    private static $tenantId = null;
    private static $isSuperAdmin = false;

    public static function setUser($user) {
        self::$user = $user;
        self::$isSuperAdmin = isset($user['is_super_admin']) && ($user['is_super_admin'] == 1 || $user['is_super_admin'] === true);
    }

    public static function getUser() {
        return self::$user;
    }

    public static function setTenantId($id) {
        self::$tenantId = $id;
    }

    public static function getTenantId() {
        return self::$tenantId;
    }

    public static function isSuperAdmin() {
        return self::$isSuperAdmin;
    }

    public static function getTenantFilter($alias = '') {
        $tenantId = self::getTenantId();
        if (!$tenantId) return "1=1";
        $prefix = $alias ? "$alias." : "";
        return "(" . $prefix . "tenant_id = " . (int)$tenantId . " OR " . $prefix . "tenant_id IS NULL)";
    }
}
