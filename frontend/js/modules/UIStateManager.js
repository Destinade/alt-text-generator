export class UIStateManager {
	constructor(elements) {
		this.elements = elements;
	}

	updateUI(state) {
		this.elements.exportResult.innerHTML = `
            <div class="result-summary ${state.status}">
                <h3>${state.message}</h3>
                ${this.getStatsHTML(state.data)}
            </div>
        `;
		this.elements.exportResult.style.opacity = "1";
		this.updateActionButtons(state);
	}

	getStatsHTML(data) {
		if (!data) return "";
		return `
            <div class="stats">
                <p>Total images: ${data.stats.total}</p>
                <p>Successfully processed: ${data.stats.successful}</p>
                <p>Failed: ${data.stats.failed}</p>
            </div>
        `;
	}

	updateActionButtons(state) {
		if (this.elements.exportActions) {
			this.elements.exportActions.style.display =
				state.status === "success" && state.data?.stats.successful > 0
					? "flex"
					: "none";
		}

		if (this.elements.downloadBtn) {
			this.elements.downloadBtn.disabled = false;
		}
		if (this.elements.emailBtn) {
			this.elements.emailBtn.disabled = false;
		}
	}

	showError(message) {
		this.updateUI({
			message,
			status: "error",
		});
	}
}
