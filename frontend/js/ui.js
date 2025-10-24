/**
 * UI Service Module
 * Handles all UI interactions, DOM manipulation, and user feedback
 */
class UIService {
    constructor(config) {
        this.config = config;
        this.messageElements = new Map();
        this.initializeMessageElements();
    }

    /**
     * Initialize message elements for different UI sections
     */
    initializeMessageElements() {
        const messageIds = ['message', 'action-message', 'contract-message'];
        messageIds.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                this.messageElements.set(id, element);
            }
        });
    }

    /**
     * Show a message to the user
     * @param {string} elementId - ID of the message element
     * @param {string} message - Message text
     * @param {string} type - Message type (success, error, default)
     */
    showMessage(elementId, message, type = 'default') {
        const element = this.messageElements.get(elementId);
        if (!element) {
            console.warn(`Message element with ID '${elementId}' not found`);
            return;
        }

        // Clear existing classes and set new ones
        element.textContent = message;
        element.className = '';
        element.classList.add(type);
        element.style.display = 'block';

        // Set default styling for default messages
        if (type === this.config.CLASSES.DEFAULT) {
            element.style.backgroundColor = '#eee';
            element.style.color = '#333';
        }

        // Auto-hide message after specified duration
        setTimeout(() => {
            this.hideMessage(elementId);
        }, this.config.UI.MESSAGE_DISPLAY_DURATION);
    }

    /**
     * Hide a message element
     * @param {string} elementId - ID of the message element
     */
    hideMessage(elementId) {
        const element = this.messageElements.get(elementId);
        if (element) {
            element.style.transition = `opacity ${this.config.UI.FADE_DURATION}ms`;
            element.style.opacity = '0';
            setTimeout(() => {
                element.style.display = 'none';
                element.style.opacity = '1';
            }, this.config.UI.FADE_DURATION);
        }
    }

    /**
     * Show/hide elements with smooth transitions
     * @param {string} elementId - Element ID
     * @param {boolean} show - Whether to show or hide
     * @param {string} method - Animation method (slide, fade, toggle)
     */
    toggleElement(elementId, show = null, method = 'slide') {
        const element = document.getElementById(elementId);
        if (!element) return;

        const isVisible = element.style.display !== 'none' && 
                         !element.classList.contains(this.config.CLASSES.HIDDEN);

        const shouldShow = show !== null ? show : !isVisible;

        if (method === 'slide') {
            if (shouldShow) {
                $(element).slideDown(this.config.UI.ANIMATION_DURATION);
            } else {
                $(element).slideUp(this.config.UI.ANIMATION_DURATION);
            }
        } else if (method === 'fade') {
            if (shouldShow) {
                $(element).fadeIn(this.config.UI.ANIMATION_DURATION);
            } else {
                $(element).fadeOut(this.config.UI.ANIMATION_DURATION);
            }
        } else {
            element.style.display = shouldShow ? 'block' : 'none';
        }
    }

    /**
     * Set loading state for an element
     * @param {string} elementId - Element ID
     * @param {boolean} loading - Loading state
     * @param {string} loadingText - Text to show while loading
     */
    setLoadingState(elementId, loading = true, loadingText = 'Caricamento...') {
        const element = document.getElementById(elementId);
        if (!element) return;

        if (loading) {
            element.classList.add(this.config.CLASSES.LOADING);
            element.disabled = true;
            if (element.tagName === 'BUTTON') {
                element.dataset.originalText = element.textContent;
                element.textContent = loadingText;
            }
        } else {
            element.classList.remove(this.config.CLASSES.LOADING);
            element.disabled = false;
            if (element.tagName === 'BUTTON' && element.dataset.originalText) {
                element.textContent = element.dataset.originalText;
                delete element.dataset.originalText;
            }
        }
    }

    /**
     * Update user profile display
     * @param {Object} profileData - User profile data
     */
    updateProfile(profileData) {
        const nameElement = document.getElementById('profile-name');
        const traitElement = document.getElementById('profile-trait');
        const traitDescElement = document.getElementById('trait-description');

        if (nameElement) nameElement.textContent = profileData.username;
        
        if (traitElement && traitDescElement) {
            if (profileData.trait) {
                traitElement.textContent = profileData.trait.name;
                traitDescElement.textContent = `Effetto: ${profileData.trait.description}`;
            } else {
                traitElement.textContent = 'Nessun Tratto Assegnato';
                traitDescElement.textContent = '';
            }
        }
    }

    /**
     * Render skills list
     * @param {Array} skills - Array of skill objects
     * @param {Function} onSkillUse - Callback for skill use button clicks
     */
    renderSkills(skills, onSkillUse) {
        const container = document.getElementById('skill-output');
        if (!container) return;

        let html = '';
        skills.forEach(skill => {
            const levelProgress = skill.xp_to_next > 0 ? 
                (skill.xp_on_level / skill.xp_to_next) * 100 : 100;
            const xpDisplay = skill.xp_to_next > 0 ? 
                `${skill.xp_on_level} / ${skill.xp_to_next}` : 'MAESTRO';

            html += `
                <div class="skill-item">
                    <div class="skill-info">
                        <strong>${skill.name}</strong> [${skill.base_class}] - Livello ${skill.current_level}
                        <br>
                        <span class="skill-xp">XP: ${xpDisplay}</span>
                        <div class="skill-progress">
                            <div class="skill-progress-bar" style="width: ${levelProgress}%"></div>
                        </div>
                    </div>
                    <button class="use-skill-btn" data-skill-name="${skill.name}">
                        Usa ${skill.name}
                    </button>
                </div>
            `;
        });

        container.innerHTML = html;

        // Attach event listeners
        container.querySelectorAll('.use-skill-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const skillName = e.target.dataset.skillName;
                onSkillUse(skillName);
            });
        });
    }

    /**
     * Render contracts list
     * @param {Array} contracts - Array of contract objects
     * @param {string} currentUserId - Current user ID
     * @param {Function} onContractAccept - Callback for contract acceptance
     */
    renderContracts(contracts, currentUserId, onContractAccept) {
        const container = document.getElementById('contracts-list-output');
        if (!container) return;

        let html = '';
        
        if (contracts.length === 0) {
            html = '<p class="no-contracts">Nessun contratto disponibile al tuo livello di competenza. Continua ad allenarti!</p>';
        } else {
            contracts.forEach(contract => {
                const isProposer = contract.proposer_id == currentUserId;
                const statusText = contract.status === 'OPEN' ? 'APERTO' : contract.status;
                const acceptButton = isProposer 
                    ? `<button class="contract-owner-btn">Pubblicato da te</button>`
                    : `<button class="accept-contract-btn" data-contract-id="${contract.contract_id}">Accetta Contratto</button>`;

                html += `
                    <div class="contract-item">
                        <div class="contract-details">
                            <strong>${contract.title}</strong> (Stato: ${statusText})
                            <br>
                            <span class="contract-requirement">Richiesto: ${contract.required_skill_name} (Liv. ${contract.required_level}+)</span>
                            <span class="contract-proposer"> | Proponente: ${contract.proposer_name}</span>
                        </div>
                        <div class="contract-actions">
                            <span class="contract-reward">${contract.reward_amount} Oro</span>
                            <div class="contract-button">${acceptButton}</div>
                        </div>
                    </div>
                `;
            });
        }

        container.innerHTML = html;

        // Attach event listeners
        container.querySelectorAll('.accept-contract-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const contractId = e.target.dataset.contractId;
                onContractAccept(contractId);
            });
        });
    }

    /**
     * Populate skill dropdown for contract creation
     * @param {Array} skills - Array of unique skill names
     */
    populateSkillDropdown(skills) {
        const select = document.getElementById('required-skill-name');
        if (!select) return;

        select.disabled = false;
        select.innerHTML = '<option value="">Seleziona Mestiere Richiesto</option>';
        
        skills.forEach(skillName => {
            const option = document.createElement('option');
            option.value = skillName;
            option.textContent = skillName;
            select.appendChild(option);
        });
    }

    /**
     * Clear form fields
     * @param {string} formId - Form ID
     */
    clearForm(formId) {
        const form = document.getElementById(formId);
        if (!form) return;

        const inputs = form.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            if (input.type === 'checkbox' || input.type === 'radio') {
                input.checked = false;
            } else {
                input.value = '';
            }
        });
    }

    /**
     * Show/hide sections based on user state
     * @param {boolean} hasUser - Whether user is logged in
     */
    toggleUserSections(hasUser) {
        const creationForm = document.getElementById('creation-form');
        const profile = document.getElementById('profile');
        const contractBoard = document.getElementById('contract-board');

        if (hasUser) {
            if (creationForm) creationForm.style.display = 'none';
            if (profile) profile.style.display = 'block';
            if (contractBoard) contractBoard.style.display = 'block';
        } else {
            if (creationForm) creationForm.style.display = 'block';
            if (profile) profile.style.display = 'none';
            if (contractBoard) contractBoard.style.display = 'none';
        }
    }
}

// Create singleton instance
const uiService = new UIService(CONFIG);

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIService;
}
