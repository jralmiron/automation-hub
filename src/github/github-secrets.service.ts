import sodium from "tweetsodium";
import { env } from "../config/env.js";

type GitHubPublicKeyResponse = {
  key_id: string;
  key: string;
};

async function githubRequest<T>(path: string, init?: RequestInit) {
  if (!env.GITHUB_TOKEN || !env.GITHUB_OWNER || !env.GITHUB_REPO) {
    throw new Error("Faltan GITHUB_TOKEN, GITHUB_OWNER o GITHUB_REPO");
  }

  const response = await fetch(
    `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}${path}`,
    {
      ...init,
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${env.GITHUB_TOKEN}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    },
  );

  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new Error(payload?.message || `GitHub devolvió ${response.status}`);
  }

  return payload as T;
}

async function getRepoPublicKey() {
  return githubRequest<GitHubPublicKeyResponse>("/actions/secrets/public-key");
}

export async function upsertGitHubSecret(name: string, value: string) {
  const publicKey = await getRepoPublicKey();
  const messageBytes = Buffer.from(value);
  const keyBytes = Buffer.from(publicKey.key, "base64");
  const encryptedBytes = sodium.seal(messageBytes, keyBytes);
  const encrypted_value = Buffer.from(encryptedBytes).toString("base64");

  await githubRequest(`/actions/secrets/${name}`, {
    method: "PUT",
    body: JSON.stringify({
      encrypted_value,
      key_id: publicKey.key_id,
    }),
  });

  return { ok: true as const, name };
}
