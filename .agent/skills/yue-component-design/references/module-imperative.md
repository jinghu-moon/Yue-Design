# Imperative components

Use for APIs such as `YueMessage.open()` or a programmatic notification. Treat the imperative
API as a small runtime, not a hidden component mount.

Record the mount target, app context/injection inheritance, queue and concurrency policy, id or
deduplication policy, return handle, close reason, timers, cleanup and SSR behavior. Reuse the
approved mount helper when one exists. Every returned handle must stop timers/listeners and
remove its DOM when closed or unmounted. Add a real consumer/tarball test because a unit test
inside the library cannot prove package-level app context behavior.
