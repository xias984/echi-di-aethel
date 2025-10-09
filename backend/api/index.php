<?php
// backend/index.php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once('../db_connect.php');
$pdo = getDbConnection();
$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$path_parts = explode('/', trim($path, '/'));

// --- Funzioni di Utility e Logica di Gioco ---

/**
 * Calcola il livello attuale e l'XP residuo in base all'XP totale.
 * Implementa la curva esponenziale: progressione rapida (fino a 50), media (fino a 200), esponenziale (oltre).
 */
function calculateLevelAndXP($total_xp) {
    $level = 1;
    $xp_for_next_level = 100;
    $remaining_xp = $total_xp;

    while ($remaining_xp >= $xp_for_next_level) {
        $remaining_xp -= $xp_for_next_level;
        $level++;

        // La curva XP diventa più ripida
        if ($level < 50) {
            $xp_for_next_level = 100 + $level * 25;
        } elseif ($level < 200) {
            $xp_for_next_level = 2000 + ($level - 50) * 100;
        } else {
            // Curva esponenziale per la maestria
            $xp_for_next_level = 10000 + ($level - 200) * 500;
        }
    }

    // Se il livello è il massimo (es. 1000), l'XP richiesto è infinito per bloccare la progressione
    if ($level >= 1000) {
        $xp_for_next_level = -1; // Flag per max level
    }

    return [
        'level' => $level,
        'xp_to_next' => $xp_for_next_level,
        'xp_current_level' => $remaining_xp
    ];
}

// --- 1. Endpoint: /api/user (POST per creare) ---
if ($method === 'POST' && count($path_parts) >= 2 && $path_parts[0] === 'api' && $path_parts[1] === 'user') {
    $data = json_decode(file_get_contents("php://input"), true);
    $username = $data['username'] ?? null;

    if (!$username) {
        http_response_code(400);
        echo json_encode(["error" => "Il nome utente è richiesto."]);
        exit;
    }

    try {
        // Avvia transazione per garantire che la creazione e le skill siano atomiche
        $pdo->beginTransaction();

        // 1. Inserisce il nuovo utente
        $stmt = $pdo->prepare("INSERT INTO users (username) VALUES (?) RETURNING user_id");
        $stmt->execute([$username]);
        $user_id = $stmt->fetchColumn();

        // 2. Recupera tutti i mestieri e i tratti
        $skills_stmt = $pdo->query("SELECT skill_id, name FROM skills");
        $all_skills = $skills_stmt->fetchAll(PDO::FETCH_ASSOC);

        $traits_stmt = $pdo->query("SELECT trait_id FROM traits");
        $all_traits = $traits_stmt->fetchAll(PDO::FETCH_COLUMN);

        // 3. Logica di Bilanciamento e Casualità: Assegna 3 bonus XP iniziali (Talento Nascosto)
        $skill_names = array_column($all_skills, 'name');
        $initial_xp_bonus = 1500; // XP iniziale significativo per un vantaggio
        $bonus_skills = [];
        
        // Simula la casualità con bilanciamento (sceglie 3 skill uniche)
        while (count($bonus_skills) < 3) {
            $rand_skill = $all_skills[array_rand($all_skills)];
            if (!in_array($rand_skill['skill_id'], array_column($bonus_skills, 'skill_id'))) {
                 // **Logica di Bilanciamento Semplificata**: Qui potremmo aumentare la probabilità
                 // di selezionare 'Mischia' se i lottatori sono pochi.
                 // Per ora, solo casualità per la POC (Proof of Concept).
                $bonus_skills[] = ['skill_id' => $rand_skill['skill_id'], 'xp' => $initial_xp_bonus];
            }
        }

        // 4. Assegna tutte le skill base (Livello 1, XP 0)
        $stmt_skills = $pdo->prepare("
            INSERT INTO user_skills (user_id, skill_id, current_level, current_xp)
            VALUES (?, ?, ?, ?)
        ");

        foreach ($all_skills as $skill) {
            $bonus = 0;
            $is_talented = false;
            foreach ($bonus_skills as $b) {
                if ($b['skill_id'] == $skill['skill_id']) {
                    $bonus = $b['xp'];
                    $is_talented = true;
                    break;
                }
            }
            
            $initial_level = ($bonus > 0) ? 2 : 1; // Inizia a livello 2 se ha bonus
            
            $stmt_skills->execute([
                $user_id, 
                $skill['skill_id'], 
                $initial_level,
                $bonus
            ]);
        }
        
        // 5. Assegna 1 Tratto Caratteriale Casuale (Tratto Nascosto)
        $random_trait_id = $all_traits[array_rand($all_traits)];
        $stmt_trait = $pdo->prepare("INSERT INTO user_traits (user_id, trait_id) VALUES (?, ?)");
        $stmt_trait->execute([$user_id, $random_trait_id]);

        $pdo->commit();

        http_response_code(201);
        echo json_encode([
            "message" => "Personaggio $username creato con successo! I suoi talenti nascosti sono attivi.", 
            "user_id" => $user_id
        ]);
    } catch (PDOException $e) {
        $pdo->rollBack();
        if ($e->getCode() == '23505') {
            http_response_code(409);
            echo json_encode(["error" => "Nome utente già in uso."]);
        } else {
            error_log("DB Error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(["error" => "Errore di database: " . $e->getMessage()]);
        }
    }
    exit;
}

// --- 2. Endpoint: /api/user/{user_id}/profile (GET per visualizzare) ---
if ($method === 'GET' && count($path_parts) >= 3 && $path_parts[0] === 'api' && $path_parts[3] === 'profile') {
    $user_id = (int)$path_parts[2];

    try {
        // 1. Recupera i dati di base dell'utente
        $user_stmt = $pdo->prepare("SELECT username FROM users WHERE user_id = ?");
        $user_stmt->execute([$user_id]);
        $user = $user_stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user) {
            http_response_code(404);
            echo json_encode(["error" => "Personaggio non trovato."]);
            exit;
        }

        // 2. Recupera tutte le skill e i livelli
        $skill_stmt = $pdo->prepare("
            SELECT s.name, us.current_level, us.current_xp, s.base_class, s.skill_id
            FROM user_skills us
            JOIN skills s ON us.skill_id = s.skill_id
            WHERE us.user_id = ?
            ORDER BY s.base_class
        ");
        $skill_stmt->execute([$user_id]);
        $skills = $skill_stmt->fetchAll(PDO::FETCH_ASSOC);

        // 3. Calcola l'XP per il prossimo livello per ogni skill
        foreach ($skills as &$skill) {
            $xp_data = calculateLevelAndXP($skill['current_xp']);
            $skill['current_level'] = $xp_data['level'];
            $skill['xp_to_next'] = $xp_data['xp_to_next'];
            $skill['xp_on_level'] = $xp_data['xp_current_level'];
        }

        // 4. Recupera il tratto caratteriale
        $trait_stmt = $pdo->prepare("
            SELECT t.name, t.description, t.code_modifier 
            FROM user_traits ut
            JOIN traits t ON ut.trait_id = t.trait_id
            WHERE ut.user_id = ?
        ");
        $trait_stmt->execute([$user_id]);
        $trait = $trait_stmt->fetch(PDO::FETCH_ASSOC);


        http_response_code(200);
        echo json_encode([
            'username' => $user['username'],
            'skills' => $skills,
            'trait' => $trait ?: null
        ]);
    } catch (Exception $e) {
        error_log("API Error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(["error" => "Errore interno del server durante il recupero del profilo."]);
    }
    exit;
}


// --- 3. NUOVO Endpoint: /api/action/use (POST per usare l'abilità e guadagnare XP) ---
if ($method === 'POST' && count($path_parts) >= 3 && $path_parts[0] === 'api' && $path_parts[1] === 'action' && $path_parts[2] === 'use') {
    $data = json_decode(file_get_contents("php://input"), true);
    $user_id = (int)($data['user_id'] ?? 0);
    $skill_name = $data['skill_name'] ?? null;
    $action_time = $data['action_time'] ?? 5; // Tempo di base in secondi (simulato)

    if (!$user_id || !$skill_name) {
        http_response_code(400);
        echo json_encode(["error" => "ID Utente e Nome Abilità sono richiesti."]);
        exit;
    }

    try {
        // 1. Recupera la skill e il tratto attuale dell'utente
        $skill_data_stmt = $pdo->prepare("
            SELECT us.user_skill_id, us.current_xp, s.skill_id
            FROM user_skills us
            JOIN skills s ON us.skill_id = s.skill_id
            WHERE us.user_id = ? AND s.name = ?
        ");
        $skill_data_stmt->execute([$user_id, $skill_name]);
        $current_skill = $skill_data_stmt->fetch(PDO::FETCH_ASSOC);

        if (!$current_skill) {
            http_response_code(404);
            echo json_encode(["error" => "Abilità non trovata per questo utente."]);
            exit;
        }

        $trait_stmt = $pdo->prepare("
            SELECT t.code_modifier FROM user_traits ut
            JOIN traits t ON ut.trait_id = t.trait_id
            WHERE ut.user_id = ?
        ");
        $trait_stmt->execute([$user_id]);
        $trait = $trait_stmt->fetch(PDO::FETCH_ASSOC);
        $trait_modifier = $trait['code_modifier'] ?? null;
        
        // 2. Logica di Guadagno XP (Variabilità e Casualità)
        $base_xp = 50;
        $roll = rand(1, 100); // Tiro D100 per l'esito

        $result_message = "Successo Base. ";
        $xp_multiplier = 1.0;

        if ($roll > 90) { // Successo Critico (10% di base)
            $result_message = "Successo Critico! Ottieni un bonus per la qualità.";
            $xp_multiplier = 2.5;
        } elseif ($roll < 5) { // Fallimento Critico (5% di base)
            $result_message = "Fallimento Critico! Tempo sprecato, guadagno XP minimo.";
            $xp_multiplier = 0.1;
        }
        
        // 3. Applicazione Tratto Caratteriale (Esempio: Audace)
        if ($trait_modifier === 'BONUS_CRIT_RISK_AREA' && $roll > 80) { // Aumenta il critico se Audace
             $result_message = "Successo Critico (Bonus Tratto Audace)! Massima ricompensa.";
             $xp_multiplier = max($xp_multiplier, 3.0);
        }

        $xp_gain = (int)($base_xp * $xp_multiplier);
        $new_total_xp = $current_skill['current_xp'] + $xp_gain;
        $old_level_data = calculateLevelAndXP($current_skill['current_xp']);
        $new_level_data = calculateLevelAndXP($new_total_xp);

        $level_up = $new_level_data['level'] > $old_level_data['level'];

        // 4. Aggiorna il database
        $update_stmt = $pdo->prepare("
            UPDATE user_skills SET current_xp = ?, current_level = ? 
            WHERE user_skill_id = ?
        ");
        $update_stmt->execute([$new_total_xp, $new_level_data['level'], $current_skill['user_skill_id']]);

        $final_message = $result_message . " Hai guadagnato " . $xp_gain . " XP in " . $skill_name . ".";
        if ($level_up) {
            $final_message .= " **CONGRATULAZIONI! Sei salito al Livello " . $new_level_data['level'] . "!**";
        }


        http_response_code(200);
        echo json_encode([
            "message" => $final_message,
            "xp_gain" => $xp_gain,
            "new_level" => $new_level_data['level'],
            "level_up" => $level_up
        ]);
        
    } catch (Exception $e) {
        error_log("Action Error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(["error" => "Errore nell'esecuzione dell'azione."]);
    }
    exit;
}


// --- Gestione di endpoint non validi ---
http_response_code(404);
echo json_encode(["error" => "Endpoint non trovato."]);
?>
