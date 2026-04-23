<?php

namespace App\Core;

class Router {
    private static $routes = [];

    public static function add($method, $path, $callback, $extra = []) {
        self::$routes[] = ['method' => strtoupper($method), 'path' => $path, 'callback' => $callback, 'extra' => $extra];
    }

    public static function get($path, $ctrl, $act, $ex = []) { self::add('GET', $path, ["App\\Controllers\\$ctrl", $act], $ex); }
    public static function post($path, $ctrl, $act, $ex = []) { self::add('POST', $path, ["App\\Controllers\\$ctrl", $act], $ex); }
    public static function put($path, $ctrl, $act, $ex = []) { self::add('PUT', $path, ["App\\Controllers\\$ctrl", $act], $ex); }
    public static function patch($path, $ctrl, $act, $ex = []) { self::add('PATCH', $path, ["App\\Controllers\\$ctrl", $act], $ex); }
    public static function delete($path, $ctrl, $act, $ex = []) { self::add('DELETE', $path, ["App\\Controllers\\$ctrl", $act], $ex); }

    public static function run($method = null, $path = null) {
        $method = $method ?? $_SERVER['REQUEST_METHOD'];
        $path = $path ?? ($_GET['path'] ?? '');

        foreach (self::$routes as $route) {
            $pattern = "#^" . preg_replace('/\{([a-zA-Z0-9_]+)\}/', '(?P<$1>[a-zA-Z0-9_-]+)', $route['path']) . "$#";
            if ($method === $route['method'] && preg_match($pattern, $path, $matches)) {
                $params = array_merge($route['extra'], array_values(array_filter($matches, 'is_string', ARRAY_FILTER_USE_KEY)));
                $ctrlName = $route['callback'][0];
                $action = $route['callback'][1];
                $controller = new $ctrlName();
                return $controller->{$action}(...$params);
            }
        }
        return false;
    }
}
