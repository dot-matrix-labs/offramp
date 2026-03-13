use calypso_cli::github::{GithubCheckId, GithubEnvironment, GithubStatus, collect_github_report};
use calypso_cli::state::PullRequestRef;

#[derive(Default)]
struct FakeGithubEnvironment {
    pr_exists: bool,
    pr_merged: bool,
    checks_green: bool,
}

impl FakeGithubEnvironment {
    fn with_pr_exists(mut self, exists: bool) -> Self {
        self.pr_exists = exists;
        self
    }

    fn with_pr_merged(mut self, merged: bool) -> Self {
        self.pr_merged = merged;
        self
    }

    fn with_checks_green(mut self, green: bool) -> Self {
        self.checks_green = green;
        self
    }
}

impl GithubEnvironment for FakeGithubEnvironment {
    fn pr_exists(&self, _pull_request: &PullRequestRef) -> bool {
        self.pr_exists
    }

    fn pr_merged(&self, _pull_request: &PullRequestRef) -> bool {
        self.pr_merged
    }

    fn checks_green(&self, _pull_request: &PullRequestRef) -> bool {
        self.checks_green
    }
}

fn sample_pr() -> PullRequestRef {
    PullRequestRef {
        number: 231,
        url: "https://github.com/org/repo/pull/231".to_string(),
    }
}

#[test]
fn github_report_collects_expected_statuses() {
    let report = collect_github_report(
        &FakeGithubEnvironment::default()
            .with_pr_exists(true)
            .with_pr_merged(false)
            .with_checks_green(true),
        &sample_pr(),
    );

    assert_eq!(
        report.checks[0],
        calypso_cli::github::GithubCheck {
            id: GithubCheckId::PullRequestExists,
            status: GithubStatus::Passing,
        }
    );
    assert_eq!(
        report.checks[1],
        calypso_cli::github::GithubCheck {
            id: GithubCheckId::PullRequestMerged,
            status: GithubStatus::Failing,
        }
    );
    assert_eq!(
        report.checks[2],
        calypso_cli::github::GithubCheck {
            id: GithubCheckId::PullRequestChecksGreen,
            status: GithubStatus::Passing,
        }
    );
}

#[test]
fn github_report_converts_statuses_to_builtin_evidence() {
    let report = collect_github_report(
        &FakeGithubEnvironment::default()
            .with_pr_exists(true)
            .with_pr_merged(true)
            .with_checks_green(false),
        &sample_pr(),
    );

    let evidence = report.to_builtin_evidence();

    assert_eq!(evidence.result_for("builtin.github.pr_exists"), Some(true));
    assert_eq!(evidence.result_for("builtin.github.pr_merged"), Some(true));
    assert_eq!(
        evidence.result_for("builtin.github.pr_checks_green"),
        Some(false)
    );
}
