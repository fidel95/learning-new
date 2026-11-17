# Security checklist (review before every release)

- [ ] No secrets in the repo or its history (keys live in the platform's secret store; `.env` is git-ignored)
- [ ] All user input validated on the SERVER (type, length, range), never only in the browser
- [ ] Every database query is parameterized; no string-built SQL
- [ ] Every endpoint checks authentication, and authorization (may THIS user touch THIS record?)
- [ ] Passwords (if any) are hashed with bcrypt/scrypt/argon2, never stored or logged in plain text
- [ ] Error responses never include stack traces or internal details
- [ ] Rate limiting or other abuse control on login and on any expensive or public endpoint
- [ ] HTTPS only; cookies (if any) are HttpOnly, Secure, SameSite
- [ ] Dependencies are up to date and `npm audit` shows nothing severe
- [ ] Logs contain no passwords, tokens or personal data
