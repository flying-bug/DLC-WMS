import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    clearActiveWorkflow,
    readActiveWorkflow,
    subscribeToActiveWorkflow,
    updateActiveWorkflowStep,
} from '../../utils/workflowSession';
import styles from './ActiveWorkflowGuide.module.css';

function ActiveWorkflowGuide() {
    const navigate = useNavigate();
    const [session, setSession] = useState(readActiveWorkflow);
    const [minimized, setMinimized] = useState(false);

    useEffect(() => subscribeToActiveWorkflow(setSession), []);

    if (!session?.steps?.length) return null;

    const safeStepIndex = Math.min(Math.max(session.stepIndex || 0, 0), session.steps.length - 1);
    const currentStep = session.steps[safeStepIndex];
    const nextStep = session.steps[safeStepIndex + 1];
    const progress = ((safeStepIndex + 1) / session.steps.length) * 100;

    const goToCurrentStep = () => navigate(currentStep.path);

    const completeCurrentStep = () => {
        if (!nextStep) {
            clearActiveWorkflow();
            setSession(null);
            navigate('/dashboard');
            return;
        }

        const nextSession = updateActiveWorkflowStep(session, safeStepIndex + 1);
        setSession(nextSession);
        navigate(nextStep.path);
    };

    const stopWorkflow = () => {
        clearActiveWorkflow();
        setSession(null);
    };

    if (minimized) {
        return (
            <aside className={styles.minimizedGuide} aria-label="Quy trình đang thực hiện">
                <button type="button" className={styles.restoreButton} onClick={() => setMinimized(false)}>
                    <i className="fas fa-route" aria-hidden="true"></i>
                    <span>{session.workflowLabel}: bước {safeStepIndex + 1}/{session.steps.length}</span>
                    <i className="fas fa-chevron-up" aria-hidden="true"></i>
                </button>
            </aside>
        );
    }

    return (
        <aside className={styles.guide} aria-label="Quy trình đang thực hiện">
            <div className={styles.progressTrack} aria-hidden="true">
                <span style={{ width: `${progress}%` }}></span>
            </div>

            <div className={styles.guideIdentity}>
                <span className={styles.guideIcon}><i className="fas fa-route" aria-hidden="true"></i></span>
                <div>
                    <small>Quy trình đang thực hiện</small>
                    <strong>{session.workflowLabel}</strong>
                </div>
            </div>

            <button type="button" className={styles.currentStep} onClick={goToCurrentStep}>
                <span>Bước {safeStepIndex + 1}/{session.steps.length}</span>
                <strong>{currentStep.title}</strong>
            </button>

            <div className={styles.guideActions}>
                <button type="button" className={styles.nextButton} onClick={completeCurrentStep}>
                    <span>{nextStep ? 'Đã xong · Tiếp theo' : 'Hoàn tất quy trình'}</span>
                    {nextStep && <strong>{nextStep.title}</strong>}
                    <i className={`fas ${nextStep ? 'fa-arrow-right' : 'fa-check'}`} aria-hidden="true"></i>
                </button>
                <button type="button" className={`${styles.iconButton} ${styles.minimizeButton}`} onClick={() => setMinimized(true)} aria-label="Thu gọn hướng dẫn quy trình">
                    <i className="fas fa-chevron-down" aria-hidden="true"></i>
                </button>
                <button type="button" className={styles.iconButton} onClick={stopWorkflow} aria-label="Dừng quy trình">
                    <i className="fas fa-times" aria-hidden="true"></i>
                </button>
            </div>
        </aside>
    );
}

export default ActiveWorkflowGuide;
