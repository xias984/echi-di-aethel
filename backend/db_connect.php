<?php
// backend/db_connect.php

function getDbConnection() {
    $host = 'db'; // Nome del servizio nel docker-compose
    $db = 'db_aethel';
    $user = 'user_aethel';
    $password = 'password_sicura';

    $dsn = "pgsql:host=$host;dbname=$db";
    
    try {
        $pdo = new PDO($dsn, $user, $password);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        return $pdo;
    } catch (PDOException $e) {
        // In caso di errore, restituisce un messaggio di errore chiaro
        http_response_code(500);
        die("Errore di Connessione al Database: " . $e->getMessage());
    }
}
?>