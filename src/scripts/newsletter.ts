for (const form of document.querySelectorAll<HTMLFormElement>("[data-newsletter]")) {
	form.addEventListener("submit", async (event) => {
		event.preventDefault();
		const button = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
		const status = form.querySelector<HTMLParagraphElement>("[data-newsletter-status]")!;
		const unsubscribe = form.querySelector<HTMLAnchorElement>("[data-unsubscribe-link]");
		button.disabled = true;
		const label = button.textContent;
		button.textContent = "Saving…";
		status.hidden = false;
		status.textContent = "Saving your request…";
		status.removeAttribute("data-error");
		if (unsubscribe) unsubscribe.hidden = true;
		try {
			const body = new URLSearchParams();
			for (const [key, value] of new FormData(form)) if (typeof value === "string") body.append(key, value);
			const response = await fetch(form.action, {
				method: "POST", headers: { Accept: "application/json" },
				body,
				signal: AbortSignal.timeout(15_000),
			});
			const result = await response.json();
			if (!response.ok) throw new Error(result.error || "We couldn’t save your request. Please try again.");
			status.textContent = result.message;
			if (unsubscribe && typeof result.unsubscribeUrl === "string" && /^\/newsletter\/unsubscribe#[a-f0-9]{64}$/.test(result.unsubscribeUrl)) {
				unsubscribe.href = result.unsubscribeUrl;
				unsubscribe.hidden = false;
			}
			form.reset();
		} catch (error) {
			status.setAttribute("data-error", "");
			status.textContent = error instanceof Error && error.name !== "TimeoutError" && error.name !== "TypeError"
				? error.message : "We couldn’t reach the signup service. Check your connection and try again.";
		} finally {
			button.disabled = false;
			button.textContent = label;
			status.focus();
		}
	});
}
