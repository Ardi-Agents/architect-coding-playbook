# Appendix: Observability & Operational Discipline

> **Parent**: [AGENTS.md](../AGENTS.md) | **Version**: 1.0 | **Updated**: 2026-05-08
>
> **Owns**: Production diagnostics per track, structured logging discipline, error-handling philosophy, async/concurrency rules per track.
>
> **Fires when**: "the production app is slow", "we have a memory leak", "how do we debug this in prod?", adding logging, designing error handling, writing async code, choosing a runtime.

---

## Error-Handling Philosophy (cross-track)

> A foundational rule from the kernel: **never swallow errors silently; wrap with context at boundaries; fail loudly.**

### Cross-track principles

1. **Don't catch what you can't handle.** A bare catch that returns success is worse than a propagated error. If you don't have a recovery strategy, let it propagate.
2. **Wrap with context at boundaries.** When an error crosses a layer (data access → service → API), add the context the next layer needs to make a decision.
3. **Fail loudly at startup.** Configuration errors, missing dependencies, invalid schemas — surface them at process start, not on the first request.
4. **Distinguish expected from unexpected.** Expected errors (404 on lookup, validation failure) are part of the API contract. Unexpected errors (network timeout, OOM) deserve alerting.

### Track recipes

#### Track: dotnet

> **Depth**: expert.

- **Don't catch `Exception`** without rethrowing or wrapping. `catch (Exception ex) { logger.LogError(ex, "..."); throw; }` is the rethrow pattern.
- **Custom exception types** for domain errors; let infrastructure exceptions bubble.
- **`throw new MyException(message, inner)`** preserves the inner exception's stack and enables `ex.GetBaseException()` and `ex.InnerException` traversal at log/handler time.
- **`async` exceptions** are captured in the returned `Task` — `await` it OR observe via `task.Exception` to avoid `UnobservedTaskException`.
- **Exit codes** in CLI apps: `Main` returns `int` or `Task<int>`; `0` for success, non-zero for distinct failure modes.

#### Track: python

> **Depth**: expert.

- **`raise X from y`** preserves the cause chain — equivalent to .NET's inner exception. `raise NewError("context") from e`.
- **`except Exception:`** without re-raising is a smell; either log + re-raise or be specific about the type you're catching.
- **`__exit__`** in context managers returns `False` (or omits `return`) to propagate; only return `True` if you're genuinely handling the exception.
- **`asyncio.gather(..., return_exceptions=True)`** — be deliberate about whether you want one failure to cancel siblings.

#### Track: typescript

> **Depth**: expert.

- **`Error.cause`** (ES2022) is the JS equivalent of inner exceptions: `throw new Error("context", { cause: e })`.
- **Promise rejection** on every `await` — every async function's `try/catch` handles or re-throws.
- **`process.on('unhandledRejection', ...)`** at process startup to ensure unhandled promise rejections terminate with a non-zero exit code.
- **Result types** (`neverthrow`, custom `Result<T, E>`) for explicit error propagation when the API benefits from it (boundary code, library APIs).

#### Track: go

> **Depth**: consensus.

- **`fmt.Errorf("operation: %w", err)`** wraps with context using `%w` (preserves the error chain for `errors.Is` / `errors.As`).
- **No bare `panic()`** in library code. `panic` is for genuinely unrecoverable programming errors (nil pointer the function's contract guaranteed non-nil).
- **`errors.Is(err, ErrNotFound)`** and **`errors.As(err, &target)`** for typed checks.
- **Sentinel errors** (`var ErrNotFound = errors.New("not found")`) for library API; `errors.Is` handles wrapping.

#### Track: rust

> **Depth**: consensus.

- **`thiserror`** for library error enums (typed variants with `#[from]` for conversion).
- **`anyhow`** for binary-side errors (dynamic context with `.context("...")`).
- **`?`** propagates errors; the type must implement `From<E>` for the function's return type.
- **`unwrap` / `expect`** only at the top level (binary `main`) or in tests where panic-on-unexpected is correct.
- **`Result<T, E>` everywhere** — `panic!` is for programming errors, not recoverable conditions.

---

## Structured Logging Discipline (cross-track)

> A log line is data, not prose. Use key-value pairs, not interpolated strings.

### The rule (cross-track)

❌ **Avoid**: `logger.info("User " + userId + " did " + action + " at " + timestamp)`
✅ **Prefer**: `logger.info("user_action", user_id=userId, action=action, timestamp=timestamp)` (key-value pairs)

The reason: log lines get aggregated, queried, and indexed by tools like Elasticsearch, Datadog, Splunk. Free-form interpolated strings are unsearchable; structured key-value pairs are first-class queries.

### Track recipes

#### Track: dotnet

> **Depth**: expert.

- **`ILogger<T>`** with structured templates: `_logger.LogInformation("User {UserId} did {Action} at {Timestamp}", userId, action, timestamp);`
- The template parameters become indexed fields in OpenTelemetry / Application Insights / Serilog sinks.
- **Don't string-interpolate** the message — that defeats structured logging.
- **`ILogger<T>` source-generated logging** (`LoggerMessage` attribute) for hot paths to avoid boxing.
- **Log scopes** (`using (logger.BeginScope(...))`) for request-scoped fields automatic in every nested log line.

#### Track: python

> **Depth**: expert.

- **`structlog`** for fully-structured key-value logging; alternatively stdlib `logging` with `extra=` parameter.
- **`logger.info("user_action", user_id=userId, action=action)`** with structlog's `BoundLogger`.
- **Don't f-string** the message: `logger.info(f"User {userId} did {action}")` is unsearchable.

#### Track: typescript

> **Depth**: expert.

- **`pino`** for high-performance structured logging: `logger.info({userId, action}, 'user_action')`.
- **`winston`** as an alternative; configure with `format.json()` for structured output.
- For browser: `console.log({userId, action, type: 'user_action'})` — DevTools renders the object structure.

#### Track: go

> **Depth**: consensus.

- **`log/slog`** (stdlib, Go 1.21+) is the modern choice: `slog.Info("user_action", "user_id", userId, "action", action)`.
- **`zap` or `zerolog`** for high-performance structured logging in pre-1.21 codebases.
- **Don't `fmt.Sprintf`** the log message.

#### Track: rust

> **Depth**: consensus.

- **`tracing`** crate for structured, async-aware logging: `tracing::info!(user_id = %userId, action = %action, "user_action")`.
- **`tracing-subscriber`** for output formatting (JSON for production, human-readable for dev).
- **Spans** (`#[tracing::instrument]`) for hierarchical trace context that integrates with OpenTelemetry.

---

## Async / Concurrency Discipline (cross-track)

> Async correctness is a frequent source of production incidents that don't surface in tests. The kernel-level rule: **propagate cancellation; bound goroutine/task lifetimes; document thread-safety.**

### Cross-track principles

1. **Cancellation is a first-class concern.** Every async function that does I/O accepts a cancellation signal AND propagates it down.
2. **Every spawned task has a defined termination path.** No orphaned background tasks. Cancellation, completion, or error all eventually return.
3. **Document thread-safety on public types.** "Is this `Send`? Is this thread-safe?" should be answerable from the type's docs.
4. **Avoid mixing sync and async.** A blocking call inside an async runtime is a deadlock waiting to happen.

### Track recipes

#### Track: dotnet

> **Depth**: expert.

- **`CancellationToken` propagation**: every `async` method that does I/O takes a `CancellationToken` parameter and passes it to inner calls.
- **`ConfigureAwait(false)`** in library code (avoids capturing the synchronization context); not needed in ASP.NET Core (no SynchronizationContext) but harmless.
- **`IAsyncEnumerable<T>`** for async iteration — `await foreach (var item in source.WithCancellation(ct))`.
- **`ValueTask<T>`** for hot paths where allocation matters; `Task<T>` for normal use.
- **Don't `.Result` or `.Wait()`** on a `Task` from an async context — deadlock risk on platforms with a SynchronizationContext.
- **`Task.Run`** for pushing CPU-bound work to the thread pool; **NOT** for "making sync code async" (that just shifts blocking).

#### Track: python

> **Depth**: expert.

- **`asyncio.run()` only at entry points** — never inside library code.
- **`async with` for context managers** that hold async resources (connections, locks).
- **`asyncio.CancelledError`** is special — re-raise it; don't swallow.
- **`asyncio.timeout()`** (Python 3.11+) over `wait_for` for cancellation-friendly deadlines.
- **`anyio`** for runtime-agnostic async (works with asyncio, trio, curio).
- **`asyncio.TaskGroup`** (3.11+) for structured concurrency — children cancel on parent cancellation, errors propagate cleanly.

#### Track: typescript

> **Depth**: expert.

- **`AbortController` / `AbortSignal`** for cancellation: `fetch(url, {signal})` is the canonical example.
- **`Promise.all` vs `Promise.allSettled`** — the latter doesn't reject on first failure (sometimes correct, often a bug-source).
- **Top-level `await`** is allowed in ESM modules but be deliberate about whether the module *should* block on it.
- **`Symbol.asyncIterator`** / `for await ... of` for async iteration.
- **Race conditions in event handlers** — guard against re-entrancy with locks or generation counters.

#### Track: go

> **Depth**: consensus.

- **`context.Context` propagation** — first parameter named `ctx`, passed to every function that does I/O. `context.Background()` only at entry points.
- **`context.WithTimeout` / `context.WithCancel`** for deadline / cancellation; defer the cancel function.
- **Goroutine lifecycle** — every `go func() { ... }()` has a defined termination path. No orphaned goroutines; use `sync.WaitGroup` or done-channels for coordination.
- **Race detector** (`go test -race`) in CI — production race conditions are subtle and rare in single-developer testing.
- **Channels over shared memory** for coordination; `sync.Mutex` when shared memory is genuinely the right model.

#### Track: rust

> **Depth**: consensus.

- **Async runtime choice** declared once at workspace level — `tokio`, `async-std`, `smol`. Don't mix; libraries should be runtime-agnostic via the `futures` traits or feature-flag the runtime dependency.
- **`Send + Sync`** propagation — public types document their thread-safety; if a type is `Send` but not `Sync`, callers know it can move between threads but not be shared.
- **`Arc<T>` for sharing**; **`Mutex<T>` / `RwLock<T>` for mutation under lock**; **`tokio::sync::*`** equivalents for async-friendly locks.
- **Cancellation via `tokio::select!`** with cancel-aware futures; the `tokio::sync::CancellationToken` pattern.
- **`?` propagates errors** through the async chain; `await` cannot silently drop them.

---

## Production Diagnostics (per track)

> When something is wrong in production, these are the tools you reach for. Every track has a profiler and a tracer; learn yours.

#### Track: dotnet

> **Depth**: expert.

- **`dotnet-trace`** — collect traces of running processes (CPU sampling, GC events, custom EventSource). `dotnet-trace collect --process-id <pid>`.
- **`dotnet-dump`** — capture process dumps for post-mortem analysis. `dotnet-dump collect --process-id <pid>`.
- **`dotnet-counters`** — live counter monitoring (CPU, GC, thread pool, custom). `dotnet-counters monitor --process-id <pid>`.
- **`dotnet-symbol`** — fetch debug symbols for analyzing dumps.
- **`PerfView`** (Windows) — deeper trace analysis with ETW.
- **OpenTelemetry .NET** — distributed tracing + metrics + logs to your observability backend.
- **`Microsoft.ApplicationInsights.AspNetCore`** for Azure-hosted apps.

#### Track: python

> **Depth**: expert.

- **`py-spy`** — sampling profiler that attaches to a running Python process without code modification. `py-spy top --pid <pid>` or `py-spy record -o flamegraph.svg --pid <pid>`.
- **`scalene`** — CPU + memory + GPU profiler with line-level resolution.
- **`memray`** — memory profiler (allocation tracking, leak detection).
- **`tracemalloc`** (stdlib) for tracking memory allocations.
- **`cProfile`** (stdlib) for deterministic profiling.
- **OpenTelemetry Python** — distributed tracing.

#### Track: typescript

> **Depth**: consensus.

- **Node `--inspect`** flag → Chrome DevTools attaches for profiling, debugging.
- **`clinic.js`** — Doctor (high-level health), Flame (CPU flamegraphs), BubbleProf (async bottlenecks).
- **`0x`** — flamegraph generator for Node.js.
- **`heapdump`** for snapshot-based memory analysis.
- **OpenTelemetry JS** — distributed tracing for Node and browser.
- **Sentry** — error tracking with stack traces, breadcrumbs, performance traces.

#### Track: go

> **Depth**: consensus.

- **`net/http/pprof`** — register `_ "net/http/pprof"` in `main` and the running app exposes `/debug/pprof/` HTTP endpoints for CPU, heap, goroutine, mutex, block profiles.
- **`go tool pprof`** for analysis: `go tool pprof http://localhost:6060/debug/pprof/profile`.
- **`go tool trace`** for execution traces.
- **`runtime.SetBlockProfileRate` / `SetMutexProfileFraction`** to enable contention profiles.
- **OpenTelemetry Go** — distributed tracing.

#### Track: rust

> **Depth**: consensus.

- **`cargo flamegraph`** — flamegraph generation via `perf` (Linux) or `dtrace` (macOS).
- **`tokio-console`** — live introspection of a running tokio app (tasks, resources, contention).
- **`heaptrack`** (Linux) — heap profiler that works with Rust binaries.
- **`criterion`** for microbenchmarks.
- **`tracing-opentelemetry`** for distributed tracing via the `tracing` crate.

### OpenTelemetry — cross-track standardization

OpenTelemetry is the cross-track standard for distributed tracing, metrics, and logs. Every track has a mature SDK. Pick a single observability backend (Jaeger, Tempo, Datadog, Honeycomb, etc.) and instrument all services consistently.

The protocol stays consistent across tracks; the SDK syntax differs.

---

## Operational Checklist

Before declaring a service production-ready:

- [ ] Structured logging is the default — every log line has key-value pairs, not interpolated strings
- [ ] Error handling propagates with context; no silent swallows
- [ ] Cancellation propagates through async / concurrency boundaries
- [ ] Profiling tools are documented (which command, expected output)
- [ ] Distributed tracing is wired up if the service is part of a distributed system
- [ ] Health-check endpoints exist (`/health`, `/ready`) appropriate for the deployment target
- [ ] Crash dumps are configured (track-specific) and rotation is in place
- [ ] Log aggregation is wired up; log volume is bounded
- [ ] Alert rules exist for unexpected error rates, p99 latency, resource exhaustion
