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
        $xp_for_next_level = -1;
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
    
    if (!$username) { http_response_code(400); echo json_encode(["error" => "Il nome utente è richiesto."]); exit; }

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
                $bonus_skills[] = ['skill_id' => $rand_skill['skill_id'], 'xp' => 1500];
            }
        }

        $stmt_skills = $pdo->prepare("INSERT INTO user_skills (user_id, skill_id, current_level, current_xp) VALUES (?, ?, ?, ?)");

        foreach ($all_skills as $skill) {
            $bonus = 0;
            foreach ($bonus_skills as $b) {
                if ($b['skill_id'] == $skill['skill_id']) { $bonus = $b['xp']; break; }
            }
            $initial_level = ($bonus > 0) ? 2 : 1;
            $stmt_skills->execute([ $user_id, $skill['skill_id'], $initial_level, $bonus ]);
        }
        
        $random_trait_id = $all_traits[array_rand($all_traits)];
        $stmt_trait = $pdo->prepare("INSERT INTO user_traits (user_id, trait_id) VALUES (?, ?)");
        $stmt_trait->execute([$user_id, $random_trait_id]);

        $pdo->commit();
        http_response_code(201);
        echo json_encode(["message" => "Personaggio $username creato con successo! I suoi talenti nascosti sono attivi.", "user_id" => $user_id]);
    } catch (PDOException $e) {
        $pdo->rollBack();
        if ($e->getCode() == '23505') { http_response_code(409); echo json_encode(["error" => "Nome utente già in uso."]); } 
        else { error_log("DB Error: " . $e->getMessage()); http_response_code(500); echo json_encode(["error" => "Errore di database: " . $e->getMessage()]); }
    }
    exit;
}

// --- 2. Endpoint: /api/user/{user_id}/profile (GET per visualizzare) ---
if ($method === 'GET' && count($path_parts) >= 4 && $path_parts[0] === 'api' && $path_parts[1] === 'user' && $path_parts[3] === 'profile') {
    $user_id = (int)$path_parts[2];

    try {
        $user_stmt = $pdo->prepare("SELECT username FROM users WHERE user_id = ?");
        $user_stmt->execute([$user_id]);
        $user = $user_stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user) { http_response_code(404); echo json_encode(["error" => "Personaggio non trovato."]); exit; }

        $skill_stmt = $pdo->prepare("
            SELECT s.name, us.current_level, us.current_xp, s.base_class, s.skill_id
            FROM user_skills us
            JOIN skills s ON us.skill_id = s.skill_id
            WHERE us.user_id = ?
            ORDER BY s.base_class
        ");
        $skill_stmt->execute([$user_id]);
        $skills = $skill_stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($skills as &$skill) {
            $xp_data = calculateLevelAndXP($skill['current_xp']);
            $skill['current_level'] = $xp_data['level'];
            $skill['xp_to_next'] = $xp_data['xp_to_next'];
            $skill['xp_on_level'] = $xp_data['xp_current_level'];
        }

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
    $action_time = $data['action_time'] ?? 5;

    if (!$user_id || !$skill_name) { http_response_code(400); echo json_encode(["error" => "ID Utente e Nome Abilità sono richiesti."]); exit; }

    try {
        $skill_data_stmt = $pdo->prepare("
            SELECT us.user_skill_id, us.current_xp, s.skill_id
            FROM user_skills us
            JOIN skills s ON us.skill_id = s.skill_id
            WHERE us.user_id = ? AND s.name = ?
        ");
        $skill_data_stmt->execute([$user_id, $skill_name]);
        $current_skill = $skill_data_stmt->fetch(PDO::FETCH_ASSOC);

        if (!$current_skill) { http_response_code(404); echo json_encode(["error" => "Abilità non trovata per questo utente."]); exit; }

        $trait_stmt = $pdo->prepare("
            SELECT t.code_modifier FROM user_traits ut
            JOIN traits t ON ut.trait_id = t.trait_id
            WHERE ut.user_id = ?
        ");
        $trait_stmt->execute([$user_id]);
        $trait = $trait_stmt->fetch(PDO::FETCH_ASSOC);
        $trait_modifier = $trait['code_modifier'] ?? null;
        
        $base_xp = 50;
        $roll = rand(1, 100);

        $result_message = "Successo Base. ";
        $xp_multiplier = 1.0;

        if ($roll > 90) { $result_message = "Successo Critico! Ottieni un bonus per la qualità."; $xp_multiplier = 2.5; } 
        elseif ($roll < 5) { $result_message = "Fallimento Critico! Tempo sprecato, guadagno XP minimo."; $xp_multiplier = 0.1; }
        
        if ($trait_modifier === 'BONUS_CRIT_RISK_AREA' && $roll > 80) { 
             $result_message = "Successo Critico (Bonus Tratto Audace)! Massima ricompensa.";
             $xp_multiplier = max($xp_multiplier, 3.0);
        }

        $xp_gain = (int)($base_xp * $xp_multiplier);
        $new_total_xp = $current_skill['current_xp'] + $xp_gain;
        $old_level_data = calculateLevelAndXP($current_skill['current_xp']);
        $new_level_data = calculateLevelAndXP($new_total_xp);

        $level_up = $new_level_data['level'] > $old_level_data['level'];

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

// --- 4. NUOVO Endpoint: /api/contracts (POST per creare) ---
if ($method === 'POST' && count($path_parts) >= 2 && $path_parts[0] === 'api' && $path_parts[1] === 'contracts') {
    $data = json_decode(file_get_contents("php://input"), true);

    $proposer_id = (int)($data['proposer_id'] ?? 0);
    $title = $data['title'] ?? null;
    $required_skill_name = $data['required_skill_name'] ?? null;
    $required_level = (int)($data['required_level'] ?? 1);
    $reward_amount = (int)($data['reward_amount'] ?? 0);

    if (!$proposer_id || !$title || !$required_skill_name || $reward_amount <= 0) {
        http_response_code(400);
        echo json_encode(["error" => "Dati contratto incompleti o ricompensa non valida."]);
        exit;
    }

    try {
        $pdo->beginTransaction();

        // 1. Ottieni l'ID della Skill richiesta
        $skill_stmt = $pdo->prepare("SELECT skill_id FROM skills WHERE name = ?");
        $skill_stmt->execute([$required_skill_name]);
        $required_skill_id = $skill_stmt->fetchColumn();

        if (!$required_skill_id) {
            $pdo->rollBack();
            http_response_code(404);
            echo json_encode(["error" => "Abilità richiesta non valida."]);
            exit;
        }

        // 2. Inserisci il Contratto
        $contract_stmt = $pdo->prepare("
            INSERT INTO contracts (proposer_id, title, required_skill_id, required_level, reward_amount)
            VALUES (?, ?, ?, ?, ?) RETURNING contract_id
        ");
        $contract_stmt->execute([$proposer_id, $title, $required_skill_id, $required_level, $reward_amount]);
        $contract_id = $contract_stmt->fetchColumn();
        
        // 3. Simula l'Escrow (blocco della ricompensa)
        $transaction_stmt = $pdo->prepare("
            INSERT INTO transactions (contract_id, amount, status)
            VALUES (?, ?, 'PENDING_ESCROW')
        ");
        $transaction_stmt->execute([$contract_id, $reward_amount]);

        $pdo->commit();

        http_response_code(201);
        echo json_encode(["message" => "Contratto pubblicato e ricompensa bloccata (Escrow).", "contract_id" => $contract_id]);

    } catch (PDOException $e) {
        $pdo->rollBack();
        error_log("Contract Creation Error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(["error" => "Errore di database durante la creazione del contratto."]);
    }
    exit;
}

// --- 5. NUOVO Endpoint: /api/contracts/{user_id} (GET per visualizzare con filtro) ---
if ($method === 'GET' && count($path_parts) >= 3 && $path_parts[0] === 'api' && $path_parts[1] === 'contracts') {
    $user_id = (int)($path_parts[2] ?? 0);
    
    // Per ottenere tutte le skill dell'utente e i livelli attuali
    $user_skills_stmt = $pdo->prepare("
        SELECT skill_id, current_level 
        FROM user_skills 
        WHERE user_id = ?
    ");
    $user_skills_stmt->execute([$user_id]);
    $user_skills = $user_skills_stmt->fetchAll(PDO::FETCH_KEY_PAIR); // [skill_id => level]

    // QUERY CRITICA: Seleziona solo i contratti OPEN e che soddisfano il livello minimo dell'utente
    $query = "
        SELECT 
            c.contract_id, c.title, c.reward_amount, c.required_level, c.proposer_id, c.status,
            s.name AS required_skill_name,
            u_prop.username AS proposer_name
        FROM contracts c
        JOIN skills s ON c.required_skill_id = s.skill_id
        JOIN users u_prop ON c.proposer_id = u_prop.user_id
        WHERE c.status = 'OPEN' 
    ";
    
    $where_parts = [];
    $params = [];
    
    // Filtro di visibilità: se l'utente è Loggato, filtra per livello/skill
    if ($user_id > 0 && !empty($user_skills)) {
        foreach ($user_skills as $skill_id => $level) {
            // Include contratti che richiedono questa skill E il cui livello richiesto è <= al livello dell'utente
            $where_parts[] = "(c.required_skill_id = ? AND c.required_level <= ?)";
            $params[] = $skill_id;
            $params[] = $level;
        }
    }
    
    // Aggiungi un filtro base per includere sempre i contratti per livelli bassi
    // (Per la POC, non possiamo filtrare la difficoltà, quindi mostriamo solo ciò che è raggiungibile)
    
    if (!empty($where_parts)) {
        $query .= " AND (" . implode(" OR ", $where_parts) . ")";
    } else {
        // Se non ci sono skill, mostra solo contratti di Livello 1 (missioni base)
         $query .= " AND c.required_level = 1";
    }

    $query .= " ORDER BY c.required_level ASC, c.created_at DESC";

    try {
        $contracts_stmt = $pdo->prepare($query);
        $contracts_stmt->execute($params);
        $contracts = $contracts_stmt->fetchAll(PDO::FETCH_ASSOC);

        http_response_code(200);
        echo json_encode($contracts);
    } catch (Exception $e) {
        error_log("Contract List Error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(["error" => "Errore nel recupero della bacheca."]);
    }
    exit;
}

// --- 6. NUOVO Endpoint: /api/contracts/{id}/accept (POST per accettare) ---
if ($method === 'POST' && count($path_parts) >= 4 && $path_parts[1] === 'api' && $path_parts[2] === 'contracts' && $path_parts[4] === 'accept') {
    $contract_id = (int)$path_parts[3];
    $data = json_decode(file_get_contents("php://input"), true);
    $acceptor_id = (int)($data['acceptor_id'] ?? 0);

    if (!$acceptor_id) { http_response_code(400); echo json_encode(["error" => "ID accettante richiesto."]); exit; }

    try {
        $pdo->beginTransaction();
        
        // Verifica lo stato e che non sia stato già accettato
        $check_stmt = $pdo->prepare("SELECT status FROM contracts WHERE contract_id = ?");
        $check_stmt->execute([$contract_id]);
        $status = $check_stmt->fetchColumn();

        if ($status !== 'OPEN') {
            $pdo->rollBack();
            http_response_code(409);
            echo json_encode(["error" => "Il contratto non è disponibile (Stato: $status)."]);
            exit;
        }

        // Accetta il contratto
        $update_stmt = $pdo->prepare("
            UPDATE contracts SET status = 'ACCEPTED', accepted_by_id = ?, accepted_at = NOW()
            WHERE contract_id = ?
        ");
        $update_stmt->execute([$acceptor_id, $contract_id]);

        $pdo->commit();
        http_response_code(200);
        echo json_encode(["message" => "Contratto accettato con successo! Inizia il tuo lavoro."]);

    } catch (PDOException $e) {
        $pdo->rollBack();
        error_log("Accept Contract Error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(["error" => "Errore nell'accettazione del contratto."]);
    }
    exit;
}


// --- Gestione di endpoint non validi ---
http_response_code(404);
echo json_encode(["error" => "Endpoint non trovato."]);
?>
