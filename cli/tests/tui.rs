use calypso_cli::state::{
    AgentSession, AgentSessionStatus, FeatureState, Gate, GateGroup, GateStatus, PullRequestRef,
    WorkflowState,
};
use calypso_cli::tui::{InputBuffer, OperatorSurface};

fn sample_feature() -> FeatureState {
    FeatureState {
        feature_id: "feat-tui-surface".to_string(),
        branch: "feat/cli-tui-operator-surface".to_string(),
        worktree_path: "/worktrees/feat-cli-tui-operator-surface".to_string(),
        pull_request: PullRequestRef {
            number: 22,
            url: "https://github.com/org/repo/pull/22".to_string(),
        },
        workflow_state: WorkflowState::WaitingForHuman,
        gate_groups: vec![
            GateGroup {
                id: "specification".to_string(),
                label: "Specification".to_string(),
                gates: vec![Gate {
                    id: "pr-canonicalized".to_string(),
                    label: "PR canonicalized".to_string(),
                    task: "pr-editor".to_string(),
                    status: GateStatus::Passing,
                }],
            },
            GateGroup {
                id: "validation".to_string(),
                label: "Validation".to_string(),
                gates: vec![Gate {
                    id: "rust-quality-green".to_string(),
                    label: "Rust quality green".to_string(),
                    task: "rust-quality".to_string(),
                    status: GateStatus::Failing,
                }],
            },
        ],
        active_sessions: vec![AgentSession {
            role: "engineer".to_string(),
            session_id: "session_01".to_string(),
            status: AgentSessionStatus::Running,
        }],
    }
}

#[test]
fn operator_surface_render_includes_feature_context_gates_and_sessions() {
    let feature = sample_feature();
    let surface = OperatorSurface::from_feature_state(
        &feature,
        vec![(
            "session_01".to_string(),
            vec![
                "Inspecting branch state".to_string(),
                "Waiting on operator guidance".to_string(),
            ],
        )],
    );

    let rendered = surface.render();

    assert!(rendered.contains("Calypso Operator Surface"));
    assert!(rendered.contains("Feature: feat-tui-surface"));
    assert!(rendered.contains("Branch: feat/cli-tui-operator-surface"));
    assert!(rendered.contains("Workflow: waiting-for-human"));
    assert!(rendered.contains("Blocking: rust-quality-green"));
    assert!(rendered.contains("Specification"));
    assert!(rendered.contains("[passing] PR canonicalized"));
    assert!(rendered.contains("Validation"));
    assert!(rendered.contains("[failing] Rust quality green"));
    assert!(rendered.contains("engineer (session_01) [running]"));
    assert!(rendered.contains("Inspecting branch state"));
    assert!(rendered.contains("Waiting on operator guidance"));
    assert!(rendered.contains("Follow-up input:"));
}

#[test]
fn input_buffer_supports_editing_and_submit() {
    let mut input = InputBuffer::default();

    input.push('h');
    input.push('i');
    input.backspace();
    input.push('!');

    assert_eq!(input.as_str(), "h!");
    assert_eq!(input.submit(), Some("h!".to_string()));
    assert_eq!(input.as_str(), "");
    assert_eq!(input.submit(), None);
}
