use crate::state::{BuiltinEvidence, PullRequestRef};

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub enum GithubCheckId {
    PullRequestExists,
    PullRequestMerged,
    PullRequestChecksGreen,
}

impl GithubCheckId {
    fn builtin_key(self) -> &'static str {
        match self {
            GithubCheckId::PullRequestExists => "builtin.github.pr_exists",
            GithubCheckId::PullRequestMerged => "builtin.github.pr_merged",
            GithubCheckId::PullRequestChecksGreen => "builtin.github.pr_checks_green",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum GithubStatus {
    Passing,
    Failing,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct GithubCheck {
    pub id: GithubCheckId,
    pub status: GithubStatus,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct GithubReport {
    pub checks: Vec<GithubCheck>,
}

impl GithubReport {
    pub fn to_builtin_evidence(&self) -> BuiltinEvidence {
        self.checks
            .iter()
            .fold(BuiltinEvidence::new(), |evidence, check| {
                evidence.with_result(
                    check.id.builtin_key(),
                    check.status == GithubStatus::Passing,
                )
            })
    }
}

pub trait GithubEnvironment {
    fn pr_exists(&self, pull_request: &PullRequestRef) -> bool;
    fn pr_merged(&self, pull_request: &PullRequestRef) -> bool;
    fn checks_green(&self, pull_request: &PullRequestRef) -> bool;
}

pub fn collect_github_report(
    environment: &impl GithubEnvironment,
    pull_request: &PullRequestRef,
) -> GithubReport {
    GithubReport {
        checks: vec![
            GithubCheck {
                id: GithubCheckId::PullRequestExists,
                status: status_from_bool(environment.pr_exists(pull_request)),
            },
            GithubCheck {
                id: GithubCheckId::PullRequestMerged,
                status: status_from_bool(environment.pr_merged(pull_request)),
            },
            GithubCheck {
                id: GithubCheckId::PullRequestChecksGreen,
                status: status_from_bool(environment.checks_green(pull_request)),
            },
        ],
    }
}

fn status_from_bool(passing: bool) -> GithubStatus {
    if passing {
        GithubStatus::Passing
    } else {
        GithubStatus::Failing
    }
}
