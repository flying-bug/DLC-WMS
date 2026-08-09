const ACTIVE_WORKFLOW_KEY = 'dlc_active_workflow';
const WORKFLOW_CHANGE_EVENT = 'dlc-active-workflow-change';

export const readActiveWorkflow = () => {
    try {
        const stored = localStorage.getItem(ACTIVE_WORKFLOW_KEY);
        return stored ? JSON.parse(stored) : null;
    } catch {
        return null;
    }
};

export const saveActiveWorkflow = (workflow, stepIndex = 0) => {
    const session = {
        version: 1,
        workflowId: workflow.id,
        workflowLabel: workflow.label,
        workflowTitle: workflow.title,
        stepIndex,
        steps: workflow.steps.map(step => ({
            title: step.title,
            description: step.description,
            path: step.path,
        })),
    };

    localStorage.setItem(ACTIVE_WORKFLOW_KEY, JSON.stringify(session));
    window.dispatchEvent(new CustomEvent(WORKFLOW_CHANGE_EVENT, { detail: session }));
    return session;
};

export const updateActiveWorkflowStep = (session, stepIndex) => {
    const nextSession = { ...session, stepIndex };
    localStorage.setItem(ACTIVE_WORKFLOW_KEY, JSON.stringify(nextSession));
    window.dispatchEvent(new CustomEvent(WORKFLOW_CHANGE_EVENT, { detail: nextSession }));
    return nextSession;
};

export const clearActiveWorkflow = () => {
    localStorage.removeItem(ACTIVE_WORKFLOW_KEY);
    window.dispatchEvent(new CustomEvent(WORKFLOW_CHANGE_EVENT, { detail: null }));
};

export const subscribeToActiveWorkflow = (listener) => {
    const handleCustomChange = event => listener(event.detail ?? readActiveWorkflow());
    const handleStorageChange = event => {
        if (event.key === ACTIVE_WORKFLOW_KEY) listener(readActiveWorkflow());
    };

    window.addEventListener(WORKFLOW_CHANGE_EVENT, handleCustomChange);
    window.addEventListener('storage', handleStorageChange);

    return () => {
        window.removeEventListener(WORKFLOW_CHANGE_EVENT, handleCustomChange);
        window.removeEventListener('storage', handleStorageChange);
    };
};
