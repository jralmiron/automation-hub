export type TriggerHealthcheckResult =
  | { ok: false; skipped: true; reason: string }
  | { ok: false; status: number; error: string }
  | {
      ok: true;
      status: number;
      environment: {
        id: string;
        slug: string;
        type: string;
        shortcode: string | null;
        paused: boolean;
      };
      project?: {
        id: string;
        slug: string;
        name: string;
      };
      organization?: {
        id: string;
        slug: string;
        title: string;
      };
    };
