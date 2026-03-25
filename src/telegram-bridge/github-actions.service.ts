import { env } from "../config/env.js";

function resolveRepo() {
  if (env.GITHUB_OWNER && env.GITHUB_REPO) {
    return { owner: env.GITHUB_OWNER, repo: env.GITHUB_REPO };
  }

  if (env.GITHUB_REPOSITORY?.includes("/")) {
    const [owner, repo] = env.GITHUB_REPOSITORY.split("/", 2);
    return { owner, repo };
  }

  throw new Error("Falta GITHUB_OWNER/GITHUB_REPO o GITHUB_REPOSITORY");
}

export async function dispatchManualWorkflow(job: string, text?: string) {
  if (!env.GITHUB_TOKEN) {
    throw new Error("Falta GITHUB_TOKEN");
  }

  const { owner, repo } = resolveRepo();
  const url = `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${env.GITHUB_WORKFLOW_FILE}/dispatches`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ref: env.GITHUB_REF,
      inputs: {
        job,
        text: text ?? "",
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GitHub workflow dispatch failed (${response.status}): ${body}`);
  }

  return {
    ok: true,
    owner,
    repo,
    workflow: env.GITHUB_WORKFLOW_FILE,
    ref: env.GITHUB_REF,
    job,
  };
}

export async function getLatestWorkflowStatus() {
  if (!env.GITHUB_TOKEN) {
    return { ok: false, skipped: true, reason: "Falta GITHUB_TOKEN" };
  }

  const { owner, repo } = resolveRepo();
  const url = `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${env.GITHUB_WORKFLOW_FILE}/runs?per_page=1`;
  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (!response.ok) {
    const body = await response.text();
    return { ok: false, status: response.status, error: body };
  }

  const payload = await response.json();
  const run = payload?.workflow_runs?.[0];
  if (!run) {
    return { ok: true, run: null };
  }

  return {
    ok: true,
    run: {
      name: run.name,
      status: run.status,
      conclusion: run.conclusion,
      event: run.event,
      html_url: run.html_url,
      created_at: run.created_at,
    },
  };
}
