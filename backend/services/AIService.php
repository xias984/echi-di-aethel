<?php
require_once __DIR__ . '/../models/Blueprint.php';

class AIService
{
    private $pdo;
    private $blueprintModel;

    // Rank values for escalation logic
    private const RANK_VALUES = [
        'D' => 1,
        'C' => 2,
        'B' => 3,
        'A' => 4,
        'S' => 5
    ];

    public function __construct($pdo)
    {
        $this->pdo = $pdo;
        $this->blueprintModel = new Blueprint($pdo);
    }

    /**
     * Azioni di Processo predefinite dell'ecosistema Aethel.
     * Rappresentano le lavorazioni alchemiche/artigianali applicabili durante la sintesi.
     * L'IA seleziona quelle più coerenti con gli ingredienti e i parametri ricevuti.
     */
    private const PROCESS_ACTIONS = [
        'Modellare',       // Dare forma fisica a materiali plastici o fusi
        'Raffinare',       // Purificare ed eliminare le impurità del composto
        'Catalizzare',     // Accelerare o indirizzare la reazione tramite un agente esterno
        'Sperimentare',    // Testare combinazioni non standard ad alto rischio/ricompensa
        'Calibrare',       // Regolare con precisione i parametri termodinamici
        'Analizzare',      // Esaminare la struttura molecolare e le proprietà latenti
        'Estrarre',        // Isolare principi attivi o essenze concentrate
        'Stabilizzare',    // Fissare il composto per impedirne il decadimento
        'Negoziare',       // Bilanciare proprietà contrastanti per un risultato ottimale
        'Progettare',      // Costruire una struttura complessa a partire da specifiche precise
    ];

    /**
     * Costruisce il prompt per la generazione di un nuovo brevetto.
     *
     * @param array  $ingredients  Lista degli ingredienti con nome e tag
     * @param array  $params       Parametri termodinamici (temperature, pressure)
     * @param string $rollResult   Rank ottenuto dal tiro d20 (D/C/B/A/S)
     * @param string $skillName    Skill utilizzata per la sintesi (default: Fabbricazione Base)
     */
    public function generateBlueprintPrompt($ingredients, $params, $rollResult, $skillName = 'Fabbricazione Base')
    {
        $ingredientsJson   = json_encode($ingredients, JSON_UNESCAPED_UNICODE);
        $paramsJson        = json_encode($params, JSON_UNESCAPED_UNICODE);
        $actionsListStr    = implode(' | ', self::PROCESS_ACTIONS);
        $rankToTier        = ['D' => 1, 'C' => 2, 'B' => 3, 'A' => 4, 'S' => 5];
        $expectedTier      = $rankToTier[strtoupper($rollResult)] ?? 1;

        $prompt  = "Sei il Giudice di Brevetti dell'ecosistema 'Echi di Aethel'.\n";
        $prompt .= "Certifica il nuovo asset sintetizzato analizzando ingredienti, parametri e azioni di processo.\n\n";

        $prompt .= "=== INPUT SINTESI ===\n";
        $prompt .= "- Ingredienti: {$ingredientsJson}\n";
        $prompt .= "- Parametri (Temp/Press): {$paramsJson}\n";
        $prompt .= "- Rank Sintetizzatore: {$rollResult} (tier atteso: {$expectedTier}/5)\n";
        $prompt .= "- Skill Utilizzata: {$skillName}\n\n";

        $prompt .= "=== AZIONI DI PROCESSO DISPONIBILI ===\n";
        $prompt .= "Scegli 1-3 azioni tra le seguenti che meglio descrivono la lavorazione effettuata:\n";
        $prompt .= "{$actionsListStr}\n\n";

        $prompt .= "=== OUTPUT RICHIESTO ===\n";
        $prompt .= "Rispondi ESCLUSIVAMENTE con un oggetto JSON valido. NON aggiungere testo, markdown o blocchi di codice.\n";
        $prompt .= "Il JSON deve contenere TUTTI i seguenti campi:\n\n";

        $exampleJson = [
            'name'            => 'Nome evocativo del brevetto',
            'process_actions' => ['Raffinare', 'Stabilizzare'],
            'modifiers'       => [
                'Vigor'      => 2, 'Potency'    => 3, 'Integrity'  => 1,
                'Stability'  => 4, 'Durability' => 2, 'Flexibility'=> 1,
                'Purity'     => 3, 'Resilience' => 2, 'Aura'       => 1,
                'Efficiency' => 2,
            ],
            'tier'       => $expectedTier,
            'base_value' => 125.50,
            'weight_kg'  => 0.350,
            'identification_tags' => [
                'base'     => ['materiale', 'organico'],
                'technical'=> ['termostabile', 'a-bassa-densita'],
                'expert'   => ['resonance-attuned'],
            ],
            'xp_earnings' => [
                $skillName => 75,
            ],
        ];

        $prompt .= json_encode($exampleJson, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        $prompt .= "\n\n";
        $prompt .= "Regole:\n";
        $prompt .= "- modifiers: esattamente 10 chiavi, valori interi 1-10 coerenti con ingredienti e rank.\n";
        $prompt .= "- tier: intero 1-5, DEVE essere {$expectedTier} (coerente con rank {$rollResult}).\n";
        $prompt .= "- identification_tags.base: 2-4 tag descrittivi generici in italiano (es. 'cristallino', 'volatile').\n";
        $prompt .= "- identification_tags.technical: 2-3 tag tecnici o chimici (es. 'idrofobico', 'catalizzatore-acido').\n";
        $prompt .= "- identification_tags.expert: 1-2 tag riservati a conoscitori esperti (es. 'aether-conduttivo').\n";
        $prompt .= "- xp_earnings: oggetto con la skill '{$skillName}' come chiave e XP interi > 0 come valore. Scala con il rank.\n";
        $prompt .= "- process_actions: array di 1-3 stringhe scelte ESCLUSIVAMENTE dalla lista fornita.\n";

        return $prompt;
    }

    /**
     * Genera un hash univoco della ricetta (ingredienti + parametri)
     */
    public function generateRecipeHash($ingredients, $params)
    {
        // Ordina gli array per garantire che variazioni d'ordine producano lo stesso hash
        if (is_array($ingredients)) {
            sort($ingredients);
        }
        if (is_array($params)) {
            ksort($params);
        }

        $data = [
            'ingredients' => $ingredients,
            'params' => $params
        ];

        return md5(json_encode($data));
    }

    /**
     * Helper per convertire il rank in un valore numerico per il confronto
     */
    private function getRankValue($rank)
    {
        $rank = strtoupper(trim($rank ?? ''));
        return self::RANK_VALUES[$rank] ?? 0;
    }

    /**
     * Gestisce la logica R&D, Ownership ed Escalation Tecnologica
     *
     * @param int    $userId
     * @param array  $ingredients
     * @param array  $params
     * @param string $rollResult  Rank (D/C/B/A/S)
     * @param string $skillName   Skill usata per la sintesi (influenza il prompt e xp_earnings)
     */
    public function processSynthesis($userId, $ingredients, $params, $rollResult, $skillName = 'Fabbricazione Base')
    {
        $hash = $this->generateRecipeHash($ingredients, $params);
        $existingBlueprint = $this->blueprintModel->findByHash($hash);

        // Se l'hash esiste: Meccanica di 'scalata' tecnologica
        if ($existingBlueprint) {
            $existingRankValue = $this->getRankValue($existingBlueprint['rank']);
            $newRankValue = $this->getRankValue($rollResult);

            if ($newRankValue > $existingRankValue) {
                // Aggiorna owner, rank e tier del Blueprint
                $this->blueprintModel->update($existingBlueprint['id'], [
                    'owner_id' => $userId,
                    'rank'     => $rollResult,
                    'tier'     => $newRankValue,   // RANK_VALUES già mappa rank → 1-5
                ]);

                // Ricava i dati aggiornati
                $existingBlueprint['owner_id'] = $userId;
                $existingBlueprint['rank']     = $rollResult;
                $existingBlueprint['tier']     = $newRankValue;

                return [
                    'status' => 'escalated',
                    'message' => 'Brevetto esistente migliorato con successo! Hai ottenuto l\'ownership.',
                    'blueprint' => $existingBlueprint
                ];
            }
            else {
                return [
                    'status' => 'exists',
                    'message' => 'Brevetto già scoperto. Il tuo rank non è sufficiente per scalarne la proprietà.',
                    'blueprint' => $existingBlueprint
                ];
            }
        }

        // Se l'hash non esiste: Chiama l'IA e crea il nuovo Blueprint
        $prompt     = $this->generateBlueprintPrompt($ingredients, $params, $rollResult, $skillName);
        $aiResponse = $this->callAI($prompt);

        if (!$aiResponse || !isset($aiResponse['name'])) {
            return [
                'status'  => 'error',
                'message' => 'Errore durante la generazione tramite IA.'
            ];
        }

        // Valida e normalizza process_actions: solo valori dalla lista predefinita
        $validActions   = self::PROCESS_ACTIONS;
        $rawActions     = $aiResponse['process_actions'] ?? [];
        $processActions = array_values(array_filter(
            is_array($rawActions) ? $rawActions : [],
            fn($a) => in_array($a, $validActions, true)
        ));

        // Valida identification_tags: assicura la struttura a tre livelli
        $rawTags = $aiResponse['identification_tags'] ?? [];
        $identificationTags = [
            'base'      => array_values(array_filter((array)($rawTags['base']      ?? []), 'is_string')),
            'technical' => array_values(array_filter((array)($rawTags['technical'] ?? []), 'is_string')),
            'expert'    => array_values(array_filter((array)($rawTags['expert']    ?? []), 'is_string')),
        ];

        // Valida xp_earnings: solo valori interi positivi
        $rawEarnings = $aiResponse['xp_earnings'] ?? [];
        $xpEarnings  = [];
        if (is_array($rawEarnings)) {
            foreach ($rawEarnings as $skill => $xp) {
                if (is_string($skill) && is_numeric($xp) && (int)$xp > 0) {
                    $xpEarnings[$skill] = (int)$xp;
                }
            }
        }
        // Garantisce almeno una voce per la skill usata
        if (empty($xpEarnings)) {
            $xpEarnings[$skillName] = max(10, self::RANK_VALUES[strtoupper($rollResult)] ?? 1) * 10;
        }

        $blueprintData = [
            'hash'               => $hash,
            'name'               => $aiResponse['name'],
            'rank'               => $rollResult,
            'owner_id'           => $userId,
            'modifiers'          => $aiResponse['modifiers'] ?? [],
            'royalty_rate'       => 5.00,
            'base_value'         => is_numeric($aiResponse['base_value'] ?? null)
                                        ? round((float) $aiResponse['base_value'], 2)
                                        : 0.00,
            'weight_kg'          => is_numeric($aiResponse['weight_kg'] ?? null)
                                        ? round((float) $aiResponse['weight_kg'], 3)
                                        : 0.000,
            'process_actions'    => $processActions,
            'identification_tags'=> $identificationTags,
            'xp_earnings'        => $xpEarnings,
        ];

        $blueprintId = $this->blueprintModel->create($blueprintData);
        $blueprintData['id'] = $blueprintId;
        // Restituisce modifiers già decodificati per il frontend
        $blueprintData['modifiers'] = $aiResponse['modifiers'] ?? [];

        return [
            'status'    => 'new',
            'message'   => 'Nuovo brevetto scoperto! Ne sei il proprietario.',
            'blueprint' => $blueprintData
        ];
    }

    /**
     * Gestisce la chiamata API verso Google Gemini
     */
    private function callAI($prompt)
    {
        // Ottiene la chiave API dalle variabili d'ambiente
        $apiKey = getenv('GEMINI_API_KEY');

        // Fallback su $_ENV o $_SERVER a seconda di come vengono caricate le var
        if (!$apiKey) {
            $apiKey = $_ENV['GEMINI_API_KEY'] ?? $_SERVER['GEMINI_API_KEY'] ?? null;
        }

        if (!$apiKey) {
            error_log("AIService: GEMINI_API_KEY non trovata nell'ambiente.");
            return null;
        }

        $endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' . $apiKey;

        // Payload per l'API di Gemini
        $data = [
            'contents' => [
                [
                    'parts' => [
                        ['text' => $prompt]
                    ]
                ]
            ],
            'generationConfig' => [
                'responseMimeType' => 'application/json',
            ]
        ];

        $ch = curl_init($endpoint);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json'
        ]);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);

        $result = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        if ($result === false) {
            error_log("AIService: Impossibile connettersi all'API di Gemini: " . $error);
            return null;
        }

        $response = json_decode($result, true);

        // Controllo errori
        if ($httpCode >= 400 || isset($response['error'])) {
            error_log("AIService: Errore API Gemini (HTTP $httpCode): " . json_encode($response));
            return null;
        }

        // Estrazione JSON dal testo della risposta
        if (isset($response['candidates'][0]['content']['parts'][0]['text'])) {
            $jsonText = $response['candidates'][0]['content']['parts'][0]['text'];

            // Rimuove eventuali markdown tag se l'IA li aggiunge ignorando i prompt
            $jsonText = preg_replace('/```json\s*(.*?)\s*```/is', '$1', $jsonText);
            $jsonText = preg_replace('/```\s*(.*?)\s*```/is', '$1', $jsonText);

            return json_decode(trim($jsonText), true);
        }

        error_log("AIService: Risposta inaspettata dall'API di Gemini: " . $result);
        return null;
    }
}
?>
