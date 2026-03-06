<?php
// Nexus d20 Engine

class DiceEngine
{
    private $pdo;
    private $userModel;

    public function __construct($pdo)
    {
        $this->pdo = $pdo;
        $this->userModel = new User($this->pdo);
    }

    /**
     * Executes a d20 roll based on a user's statistic.
     * 
     * @param int $userId The ID of the user.
     * @param string $ability The ability to check (e.g. 'for', 'des', 'int').
     * @param int $skillBonus Any additional bonus (default 0).
     * @param int $dc The Difficulty Class to beat (default 12).
     * @return array Associative array with the roll results.
     */
    public function roll(int $userId, string $ability, int $skillBonus = 0, int $dc = 12, ?int $forceRoll = null): array
    {
        // 1. Validate ability name and map it to DB column
        $allowedAbilities = ['for', 'des', 'cos', 'int', 'sag', 'car'];
        $ability = strtolower($ability);

        if (!in_array($ability, $allowedAbilities)) {
            throw new InvalidArgumentException("Invalid ability: {$ability}");
        }
        $statColumn = 'd20_' . $ability;

        // 2. Fetch user profile
        $profile = $this->userModel->getUserProfile($userId);

        if (!$profile) {
            throw new Exception("User profile not found for ID: {$userId}");
        }

        // 3. Get the raw stat score and calculate the modifier
        $statScore = $profile['stats'][$statColumn] ?? 10;
        $modifier = $this->userModel->getModifier($statScore);

        // 4. Generate the d20 roll
        $roll = $forceRoll !== null ? $forceRoll : rand(1, 20);

        // 5. Calculate the total
        $total = $roll + $modifier + $skillBonus;

        // 6. Determine grade and success based on project rules
        // Natural 20 is typically a Crit Success, Natural 1 a Crit Fail.
        if ($roll === 20) {
            $grade = 'CRIT_SUCCESS';
            $success = true;
        }
        elseif ($roll === 1) {
            $grade = 'CRIT_FAIL';
            $success = false;
        }
        elseif ($total >= $dc) {
            $grade = 'SUCCESS';
            $success = true;
        }
        else {
            $grade = 'FAIL';
            $success = false;
        }

        return [
            'roll' => $roll,
            'total' => $total,
            'grade' => $grade,
            'success' => $success
        ];
    }
}
?>
