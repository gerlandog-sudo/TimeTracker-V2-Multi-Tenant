<?php

namespace App\Core;

abstract class BaseService {
    protected $errors = [];
    protected $messages = [];

    /**
     * Registra un error en el servicio.
     */
    protected function addError($message) {
        $this->errors[] = $message;
    }

    /**
     * Registra un mensaje de éxito o informativo.
     */
    protected function addMessage($message) {
        $this->messages[] = $message;
    }

    /**
     * Retorna los errores acumulados.
     */
    public function getErrors() {
        return $this->errors;
    }

    /**
     * Verifica si hay errores.
     */
    public function hasErrors() {
        return !empty($this->errors);
    }

    /**
     * Estandariza la respuesta para el controlador.
     */
    public function response($data = null, $status = 200) {
        return [
            'status' => $status,
            'success' => !$this->hasErrors(),
            'data' => $data,
            'errors' => $this->getErrors(),
            'messages' => $this->messages
        ];
    }
}
