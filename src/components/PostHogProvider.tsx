'use client';

import { useEffect } from 'react';
import posthog from 'posthog-js';

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      process.env.NEXT_PUBLIC_POSTHOG_KEY &&
      process.env.NEXT_PUBLIC_POSTHOG_HOST
    ) {
      posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
        loaded: (client) => {
          if (process.env.NODE_ENV === 'development') {
            client.debug();
          }
        },
      });

      posthog.capture('$pageview', {
        $current_url: window.location.href,
      });
    }
  }, []);

  return <>{children}</>;
}

