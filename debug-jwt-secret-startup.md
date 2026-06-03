# Debug Session: jwt-secret-startup

- Status: OPEN
- Symptom: backend still fails on startup with placeholder resolution for `JWT_SECRET`
- Scope: inspect environment propagation, Spring property resolution, and launch path

## Hypotheses

1. The backend process does not inherit the persisted Windows user environment variable.
2. The IDE or launcher was started before the variable existed and still uses stale environment values.
3. Another Spring config source or profile resolves JWT settings differently from the expected properties file.
4. A second JWT-related property placeholder is unresolved and appears equivalent to the original failure.
5. The current log being observed is stale and not from the latest startup attempt.

## Evidence Log

- Session created.
- No business logic modified.
- `Backend/logs/logs.md` shows `Could not resolve placeholder 'JWT_SECRET' in value "${JWT_SECRET}"`.
- Same log shows execution on thread `restartedMain`, indicating Spring Boot DevTools / IDE-launched process.
- Active profile in log is `default`; `application.properties` requires `jwt.secret=${JWT_SECRET}` with no fallback.
- `application-dev.properties` also requires `${JWT_SECRET}`.
- `application-simple.properties` has a fallback, but the log does not indicate `simple` profile is active.
- New startup log no longer shows unresolved `JWT_SECRET`.
- New root cause is Flyway/PostgreSQL authentication failure: `The server requested SCRAM-based authentication, but no password was provided.`
- Current failure source matches datasource config defaults where `spring.datasource.password=${DB_PASSWORD:}` allows empty password.
- `Backend/.env` currently does not define `DB_PASSWORD`.
- `Backend/.env` contains `jwt.secret = ...`, which is invalid `.env` syntax for the expected variable name `JWT_SECRET`.
- Current `application.properties` and `target/classes/application.properties` both define `spring.datasource.password=${DB_PASSWORD:postgres}`, so an explicitly empty `DB_PASSWORD` in the environment would override the fallback and produce the observed error.

## Hypotheses Status

1. Backend process does not inherit persisted environment variable. -> LIKELY
2. IDE/launcher started before variable existed and uses stale environment. -> VERY LIKELY
3. Another Spring config/profile resolves JWT differently. -> PARTIALLY REJECTED
4. Another unresolved JWT placeholder exists. -> NOT SUPPORTED BY CURRENT EVIDENCE
5. Observed log is stale. -> POSSIBLE, but not required to explain failure

## Updated Conclusion

- `JWT_SECRET` issue is resolved or bypassed in the latest run.
- Startup now fails at database authentication because no PostgreSQL password is being provided to Flyway/Hikari.
- Most likely explanation: the launch environment provides `DB_PASSWORD` as empty, or the `.env` loader is not supplying `DB_PASSWORD=postgres` explicitly.

## Verification Update

- Running `.\mvnw.cmd spring-boot:run` from `Backend/` now succeeds past JWT, PostgreSQL auth, Flyway PostgreSQL support, and migration V3.
- `geolimites.log` shows successful startup on port `9010`.
- Remaining discrepancy is likely between terminal execution and IDE execution/log capture, not backend bootstrap itself.
- Latest `Backend/logs/logs.md` from IDE run also shows successful startup on port `9010`.
- Flyway validates 4 migrations and reports schema up to date at version `3`.
- Data initializer reports admin bootstrap disabled, which is informational and not an error.
