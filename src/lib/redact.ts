const SECRET_PATTERNS = [
  /tr_[a-z]+_[A-Za-z0-9]+/g,
  /pk_[a-z]+_[A-Za-z0-9]+/g,
  /ghp_[A-Za-z0-9]+/g,
  /sk-[A-Za-z0-9]+/g,
  /Bearer\s+[A-Za-z0-9._-]+/gi,
];

export function redactSecrets(value: string) {
  return SECRET_PATTERNS.reduce(
    (text, pattern) => text.replace(pattern, "[REDACTED]"),
    value,
  );
}
