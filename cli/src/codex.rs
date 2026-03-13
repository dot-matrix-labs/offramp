use std::fmt;
use std::io::{BufRead, BufReader, Write};
use std::process::{Child, ChildStdin, Command, Stdio};
use std::sync::mpsc::{self, Receiver, Sender, TryRecvError};
use std::thread;
use std::time::{SystemTime, UNIX_EPOCH};

use crate::state::{
    AgentSession, AgentSessionStatus, AgentTerminalOutcome, SessionOutput, SessionOutputStream,
};

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CodexCommand {
    program: String,
    args: Vec<String>,
}

impl CodexCommand {
    pub fn new(program: impl Into<String>) -> Self {
        Self {
            program: program.into(),
            args: Vec::new(),
        }
    }

    pub fn interactive(prompt: impl Into<String>, working_directory: impl Into<String>) -> Self {
        Self::new("codex")
            .arg("--no-alt-screen")
            .arg("-C")
            .arg(working_directory)
            .arg(prompt)
    }

    pub fn arg(mut self, arg: impl Into<String>) -> Self {
        self.args.push(arg.into());
        self
    }

    pub fn program(&self) -> &str {
        &self.program
    }

    pub fn args(&self) -> &[String] {
        &self.args
    }

    fn into_command(self) -> Command {
        let mut command = Command::new(self.program);
        command.args(self.args);
        command
    }
}

#[derive(Debug)]
pub struct CodexSession {
    child: Child,
    stdin: ChildStdin,
    events: Receiver<RuntimeEvent>,
    snapshot: CodexSessionSnapshot,
    interrupted: bool,
}

impl CodexSession {
    pub fn spawn(role: &str, command: CodexCommand) -> Result<Self, CodexError> {
        let mut child = command
            .into_command()
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(CodexError::Io)?;

        let stdin = child.stdin.take().ok_or(CodexError::MissingPipe("stdin"))?;
        let stdout = child
            .stdout
            .take()
            .ok_or(CodexError::MissingPipe("stdout"))?;
        let stderr = child
            .stderr
            .take()
            .ok_or(CodexError::MissingPipe("stderr"))?;
        let (events_tx, events_rx) = mpsc::channel();

        spawn_reader(stdout, SessionOutputStream::Stdout, events_tx.clone());
        spawn_reader(stderr, SessionOutputStream::Stderr, events_tx);

        Ok(Self {
            child,
            stdin,
            events: events_rx,
            snapshot: CodexSessionSnapshot {
                role: role.to_string(),
                session_id: next_session_id(),
                provider_session_id: None,
                status: SessionStatus::Running,
                output: Vec::new(),
                terminal_outcome: None,
            },
            interrupted: false,
        })
    }

    pub fn poll_events(&mut self) -> Result<Vec<SessionOutput>, CodexError> {
        let mut drained = Vec::new();

        loop {
            match self.events.try_recv() {
                Ok(RuntimeEvent::Output(event)) => {
                    self.apply_output(&event);
                    drained.push(event);
                }
                Ok(RuntimeEvent::ReadFailure(message)) => {
                    return Err(CodexError::OutputRead(message));
                }
                Err(TryRecvError::Empty) => return Ok(drained),
                Err(TryRecvError::Disconnected) => return Ok(drained),
            }
        }
    }

    pub fn refresh_status(&mut self) -> Result<SessionStatus, CodexError> {
        self.poll_events()?;

        if let Some(status) = self.child.try_wait().map_err(CodexError::Io)? {
            let terminal_outcome = if self.interrupted {
                TerminalOutcome::Aborted
            } else if let Some(outcome) = self.snapshot.terminal_outcome {
                outcome
            } else if status.success() {
                TerminalOutcome::Ok
            } else if status.code() == Some(130) {
                TerminalOutcome::Aborted
            } else {
                TerminalOutcome::Nok
            };

            self.snapshot.terminal_outcome = Some(terminal_outcome);
            self.snapshot.status = match terminal_outcome {
                TerminalOutcome::Ok => SessionStatus::Completed,
                TerminalOutcome::Nok => SessionStatus::Failed,
                TerminalOutcome::Aborted => SessionStatus::Aborted,
            };
        }

        Ok(self.snapshot.status)
    }

    pub fn send_follow_up(&mut self, input: &str) -> Result<(), CodexError> {
        self.stdin
            .write_all(input.as_bytes())
            .and_then(|_| {
                if input.ends_with('\n') {
                    Ok(())
                } else {
                    self.stdin.write_all(b"\n")
                }
            })
            .and_then(|_| self.stdin.flush())
            .map_err(CodexError::Io)?;

        if self.snapshot.status == SessionStatus::WaitingForHuman {
            self.snapshot.status = SessionStatus::Running;
        }

        Ok(())
    }

    pub fn interrupt(&mut self) -> Result<(), CodexError> {
        self.interrupted = true;
        self.child.kill().map_err(CodexError::Io)
    }

    pub fn snapshot(&self) -> CodexSessionSnapshot {
        self.snapshot.clone()
    }

    pub fn status(&self) -> SessionStatus {
        self.snapshot.status
    }

    pub fn terminal_outcome(&self) -> Option<TerminalOutcome> {
        self.snapshot.terminal_outcome
    }

    fn apply_output(&mut self, event: &SessionOutput) {
        if let Some(session_id) = extract_provider_session_id(event.text.as_str()) {
            self.snapshot.provider_session_id = Some(session_id);
        }

        if indicates_waiting_for_human(event.text.as_str()) {
            self.snapshot.status = SessionStatus::WaitingForHuman;
        }

        if let Some(outcome) = parse_terminal_outcome(event.text.as_str()) {
            self.snapshot.terminal_outcome = Some(outcome);
        }

        self.snapshot.output.push(event.clone());
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CodexSessionSnapshot {
    pub role: String,
    pub session_id: String,
    pub provider_session_id: Option<String>,
    pub status: SessionStatus,
    pub output: Vec<SessionOutput>,
    pub terminal_outcome: Option<TerminalOutcome>,
}

impl CodexSessionSnapshot {
    pub fn persisted(&self) -> AgentSession {
        AgentSession {
            role: self.role.clone(),
            session_id: self.session_id.clone(),
            provider_session_id: self.provider_session_id.clone(),
            status: self.status.into(),
            output: self.output.clone(),
            terminal_outcome: self.terminal_outcome.map(Into::into),
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SessionStatus {
    Running,
    WaitingForHuman,
    Completed,
    Failed,
    Aborted,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TerminalOutcome {
    Ok,
    Nok,
    Aborted,
}

impl From<SessionStatus> for AgentSessionStatus {
    fn from(value: SessionStatus) -> Self {
        match value {
            SessionStatus::Running => Self::Running,
            SessionStatus::WaitingForHuman => Self::WaitingForHuman,
            SessionStatus::Completed => Self::Completed,
            SessionStatus::Failed => Self::Failed,
            SessionStatus::Aborted => Self::Aborted,
        }
    }
}

impl From<TerminalOutcome> for AgentTerminalOutcome {
    fn from(value: TerminalOutcome) -> Self {
        match value {
            TerminalOutcome::Ok => Self::Ok,
            TerminalOutcome::Nok => Self::Nok,
            TerminalOutcome::Aborted => Self::Aborted,
        }
    }
}

#[derive(Debug)]
pub enum CodexError {
    Io(std::io::Error),
    MissingPipe(&'static str),
    OutputRead(String),
}

impl fmt::Display for CodexError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            CodexError::Io(error) => write!(f, "codex runtime I/O error: {error}"),
            CodexError::MissingPipe(pipe) => {
                write!(f, "codex runtime missing expected {pipe} pipe")
            }
            CodexError::OutputRead(message) => {
                write!(f, "codex runtime failed to read process output: {message}")
            }
        }
    }
}

impl std::error::Error for CodexError {}

#[derive(Debug)]
enum RuntimeEvent {
    Output(SessionOutput),
    ReadFailure(String),
}

fn spawn_reader<R>(stream: R, output_stream: SessionOutputStream, sender: Sender<RuntimeEvent>)
where
    R: std::io::Read + Send + 'static,
{
    thread::spawn(move || {
        let reader = BufReader::new(stream);

        for line in reader.lines() {
            match line {
                Ok(text) => {
                    if sender
                        .send(RuntimeEvent::Output(SessionOutput {
                            stream: output_stream,
                            text,
                        }))
                        .is_err()
                    {
                        break;
                    }
                }
                Err(error) => {
                    let _ = sender.send(RuntimeEvent::ReadFailure(error.to_string()));
                    break;
                }
            }
        }
    });
}

fn next_session_id() -> String {
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("system time should be after unix epoch")
        .as_nanos();

    format!("codex-session-{timestamp}")
}

fn extract_provider_session_id(line: &str) -> Option<String> {
    let lower = line.to_ascii_lowercase();

    for marker in ["session id:", "session_id=", "session_id:", "session-id:"] {
        if let Some(index) = lower.find(marker) {
            let value = line[index + marker.len()..].trim();
            if !value.is_empty() {
                return Some(trim_wrapping_punctuation(value).to_string());
            }
        }
    }

    None
}

fn indicates_waiting_for_human(line: &str) -> bool {
    let lower = line.to_ascii_lowercase();
    lower.contains("waiting for human input") || lower.contains("waiting for user input")
}

fn parse_terminal_outcome(line: &str) -> Option<TerminalOutcome> {
    match line.trim() {
        "OK" => Some(TerminalOutcome::Ok),
        "NOK" => Some(TerminalOutcome::Nok),
        "ABORTED" => Some(TerminalOutcome::Aborted),
        _ => None,
    }
}

fn trim_wrapping_punctuation(value: &str) -> &str {
    value.trim_matches(|character| matches!(character, '"' | '\'' | '[' | ']' | '(' | ')'))
}
