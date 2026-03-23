import base64
import json
import os
import subprocess
import sys
from pathlib import Path
from urllib import request

from nacl import encoding, public

ROOT = Path(__file__).resolve().parent
TEMPLATE_PATH = ROOT / "github-secrets.template.json"
VAULT_SCRIPT = Path(r"D:\secretos\scripts\Get-Secret.ps1")


def get_vault_secret(name: str) -> str:
    result = subprocess.run(
        [
            "powershell",
            "-ExecutionPolicy",
            "Bypass",
            "-File",
            str(VAULT_SCRIPT),
            "-Name",
            name,
        ],
        capture_output=True,
        text=True,
        check=True,
    )
    return result.stdout.strip()


def resolve_value(mapping: str) -> str:
    if mapping.startswith("vault:"):
        return get_vault_secret(mapping.split(":", 1)[1])
    if mapping.startswith("literal:"):
        return mapping.split(":", 1)[1]
    if mapping == "env_or_manual":
        return ""
    return os.environ.get(mapping, "")


def github_request(url: str, method: str = "GET", payload: dict | None = None) -> dict:
    token = os.environ["GITHUB_TOKEN"]
    data = None
    headers = {
        "Accept": "application/vnd.github+json",
        "Authorization": f"Bearer {token}",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "automation-hub",
    }
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"

    req = request.Request(url, data=data, method=method, headers=headers)
    with request.urlopen(req) as response:
        body = response.read().decode("utf-8")
        return json.loads(body) if body else {}


def encrypt(public_key_value: str, secret_value: str) -> str:
    public_key = public.PublicKey(public_key_value.encode("utf-8"), encoding.Base64Encoder())
    sealed_box = public.SealedBox(public_key)
    encrypted = sealed_box.encrypt(secret_value.encode("utf-8"))
    return base64.b64encode(encrypted).decode("utf-8")


def main() -> int:
    config = json.loads(TEMPLATE_PATH.read_text(encoding="utf-8"))
    repo = config["repo"]
    owner, name = repo.split("/", 1)
    key_info = github_request(f"https://api.github.com/repos/{owner}/{name}/actions/secrets/public-key")
    key_id = key_info["key_id"]
    public_key_value = key_info["key"]

    configured: list[str] = []
    skipped: list[str] = []
    for secret_name, mapping in config["secrets"].items():
        value = resolve_value(mapping)
        if not value:
            skipped.append(secret_name)
            continue
        encrypted_value = encrypt(public_key_value, value)
        github_request(
            f"https://api.github.com/repos/{owner}/{name}/actions/secrets/{secret_name}",
            method="PUT",
            payload={"encrypted_value": encrypted_value, "key_id": key_id},
        )
        configured.append(secret_name)

    print(json.dumps({"configured": configured, "skipped": skipped}, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
