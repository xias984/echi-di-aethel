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
     * Costruisce il prompt rigoroso definito nelle regole del progetto
     */
    public function generateBlueprintPrompt($ingredients, $params, $rollResult)
    {
        $ingredientsJson = json_encode($ingredients, JSON_UNESCAPED_UNICODE);
        $paramsJson = json_encode($params, JSON_UNESCAPED_UNICODE);

        $prompt = "Sei il Giudice di Brevetti dell'ecosistema 'Echi di Aethel'.\n";
        $prompt .= "Il tuo compito è analizzare Tag, Dosaggi e Parametri per generare nuovi asset.\n\n";
        $prompt .= "Input Ricevuti:\n";
        $prompt .= "- Ingredienti: {$ingredientsJson}\n";
        $prompt .= "- Parametri (Temp/Press): {$paramsJson}\n";
        $prompt .= "- Risultato Tiro (Rank): {$rollResult}\n\n";
        $prompt .= "Istruzioni Rigorose:\n";
        $prompt .= "1. Valuta la combinazione per determinare il nome del nuovo brevetto.\n";
        $prompt .= "2. Genera i modificatori basati su 10 costanti universali di gioco (es. Vigor, Potency, Integrity, ecc.).\n";
        $prompt .= "3. NON includere testo aggiuntivo, markdown o blocchi di codice nella tua risposta.\n";
        $prompt .= "4. Devi rispondere ESCLUSIVAMENTE con un JSON valido strutturato così:\n";
        $prompt .= "{\n  \"name\": \"Nome del Brevetto\",\n  \"modifiers\": {\n    \"Vigor\": 2,\n    \"Potency\": 1\n  }\n}";

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
     */
    public function processSynthesis($userId, $ingredients, $params, $rollResult)
    {
        $hash = $this->generateRecipeHash($ingredients, $params);
        $existingBlueprint = $this->blueprintModel->findByHash($hash);

        // Se l'hash esiste: Meccanica di 'scalata' tecnologica
        if ($existingBlueprint) {
            $existingRankValue = $this->getRankValue($existingBlueprint['rank']);
            $newRankValue = $this->getRankValue($rollResult);

            if ($newRankValue > $existingRankValue) {
                // Aggiorna l'owner e il Rank del Blueprint
                $this->blueprintModel->update($existingBlueprint['id'], [
                    'owner_id' => $userId,
                    'rank' => $rollResult
                ]);

                // Ricava i dati aggiornati
                $existingBlueprint['owner_id'] = $userId;
                $existingBlueprint['rank'] = $rollResult;

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
        $prompt = $this->generateBlueprintPrompt($ingredients, $params, $rollResult);
        $aiResponse = $this->callAI($prompt);

        if (!$aiResponse || !isset($aiResponse['name'])) {
            return [
                'status' => 'error',
                'message' => 'Errore durante la generazione tramite IA.'
            ];
        }

        $blueprintData = [
            'hash' => $hash,
            'name' => $aiResponse['name'],
            'rank' => $rollResult,
            'owner_id' => $userId,
            'modifiers' => json_encode($aiResponse['modifiers'] ?? []),
            'royalty_rate' => 5.00 // Default, come da specifiche
        ];

        $blueprintId = $this->blueprintModel->insert($blueprintData);
        $blueprintData['id'] = $blueprintId;
        $blueprintData['modifiers'] = $aiResponse['modifiers'] ?? []; // decoded per il return

        return [
            'status' => 'new',
            'message' => 'Nuovo brevetto scoperto! Ne sei il proprietario.',
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
