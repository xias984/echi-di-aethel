<?php
// Action controller

class ActionController extends BaseController {
    private $actionModel;
    
    public function __construct($pdo) {
        parent::__construct($pdo);
        $this->actionModel = new Action($pdo);
    }
    
    /**
     * Use a skill and gain XP
     */
    public function useSkill() {
        $data = $this->getJsonInput();
        $this->validateRequired($data, ['user_id', 'skill_name']);
        
        $user_id = (int)($data['user_id'] ?? 0);
        $skill_name = $data['skill_name'] ?? null;
        $action_time = (int)($data['action_time'] ?? 5);
        
        if (!$user_id || !$skill_name) {
            $this->errorResponse("User ID and Skill Name are required.");
        }
        
        try {
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
        } catch (Exception $e) {
            error_log("Action Error: " . $e->getMessage());
            $this->errorResponse("Error executing action: " . $e->getMessage(), 500);
        }
    }
}
?>
