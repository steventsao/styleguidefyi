import { setCapturer } from "../lib/analytics";

/**
 * Public, write-only PostHog project token. It ships in the HTML by design, and it
 * still comes from the environment so a deploy cannot silently lose it.
 */
const KEY = import.meta.env.PUBLIC_POSTHOG_KEY;
const HOST = import.meta.env.PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";

/**
 * Loads PostHog and starts capturing pageviews, then hands the client to `track`.
 *
 * The import is dynamic so the analytics bundle stays off the critical path: a slower
 * first paint would cost the search ranking this instrumentation exists to measure.
 * Resolves without doing anything when no key is configured.
 */
export async function initAnalytics(): Promise<void> {
	if (!KEY) return;

	const { default: posthog } = await import("posthog-js");
	posthog.init(KEY, {
		api_host: HOST,
		// The site has no accounts, so every visitor is anonymous. Person profiles would
		// only count crawlers and cost events.
		person_profiles: "identified_only",
		capture_pageview: true,
		capture_pageleave: true,
		// Autocapture records the outbound clicks that named events would miss.
		autocapture: true,
		capture_heatmaps: true,
		session_recording: { maskAllInputs: false },
		// A browser agent drives an automated browser, which PostHog drops as a bot by
		// default. This page exists to be read by agents, so losing that traffic would
		// erase the signal. Capture it and label it below instead.
		opt_out_useragent_filter: true,
	});
	// On every event, so a report can separate a reader from an agent or a crawler.
	posthog.register({ is_automated: navigator.webdriver === true });
	setCapturer(posthog);
}
