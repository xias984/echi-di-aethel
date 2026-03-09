<?php
// Action controller

class ActionController extends BaseController
{
    private $actionModel;

    public function __construct($pdo)
    {
        parent::__construct($pdo);
        $this->actionModel = new Action($pdo);
    }

    /**
     * Use a skill and gain XP
     */
    public function useSkill()
    {
        $data = $this->getJsonInput();
        $this->validateRequired($data, ['user_id', 'skill_name']);

        $user_id = (int)($data['user_id'] ?? 0);
        $skill_name = $data['skill_name'] ?? null;
        $action_time = (int)($data['action_time'] ?? 5);

        if (!$user_id || !$skill_name) {
            $this->errorResponse("User ID and Skill Name are required.");
        }

        try {
            // Update last activity
            $userModel = new User($this->pdo);
            $userModel->updateActivity($user_id);

            $result = $this->actionModel->useSkill($user_id, $skill_name, $action_time);

            $message = $result['message'];
            if ($result['level_up']) {
                $message .= $result['level_up_message'];
            }

            $this->successResponse($message, [
                'xp_gain' => $result['xp_gain'],
                'new_level' => $result['new_level'],
                'level_up' => $result['level_up']
            ]);
        }
        catch (Exception $e) {
            error_log("Action Error: " . $e->getMessage());
            $this->errorResponse("Error executing action: " . $e->getMessage(), 500);
        }
    }

    /**
     * Handle synthesis from the Lab
     */
    public function synthesize()
    {
        $data = $this->getJsonInput();
        $this->validateRequired($data, ['user_id', 'ingredients', 'params']);

        $userId = (int)($data['user_id'] ?? 0);
        $ingredients = $data['ingredients'] ?? [];
        $params = $data['params'] ?? [];

        if (!$userId || empty($ingredients)) {
            $this->errorResponse("User ID and Ingredients are required.");
        }

        try {
            // Update last activity
            $userModel = new User($this->pdo);
            $userModel->updateActivity($userId);

            // 1. Roll d20 basato su INT del personaggio tramite DiceEngine
            require_once __DIR__ . '/../logic/DiceEngine.php';
            $diceEngine = new DiceEngine($this->pdo);

            // DC 10 per sintesi base; skill bonus 0 (alchimia non ancora implementata come skill separata)
            $rollData = $diceEngine->roll($userId, 'int', 0, 10);
            $totalRoll = $rollData['total'];
            $rawRoll = $rollData['roll'];

            // Mappa il risultato totale al rank di sintesi
            $rank = 'D';
            if ($totalRoll >= 20)
                $rank = 'S';
            elseif ($totalRoll >= 16)
                $rank = 'A';
            elseif ($totalRoll >= 11)
                $rank = 'B';
            elseif ($totalRoll >= 6)
                $rank = 'C';

            $rollResultData = [
                'total' => $totalRoll,
                'raw' => $rawRoll,
                'rank' => $rank
            ];

            // 2. Chiama l'IA per sintetizzare e registrare
            require_once __DIR__ . '/../services/AIService.php';
            $aiService = new AIService($this->pdo);

            $synthesisData = $aiService->processSynthesis($userId, $ingredients, $params, $rank);

            if ($synthesisData['status'] === 'error') {
                $this->errorResponse("Errore sintesi: " . $synthesisData['message'], 500);
            }

            $this->successResponse("Sintesi completata.", [
                'synthesisResult' => $synthesisData,
                'rollResult' => $rollResultData
            ]);
        }
        catch (Exception $e) {
            error_log("Synthesis Error: " . $e->getMessage());
            $this->errorResponse("Error executing synthesis: " . $e->getMessage(), 500);
        }
    }
}
?>
