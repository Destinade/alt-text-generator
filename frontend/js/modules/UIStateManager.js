export class UIStateManager {
	constructor(elements) {
		this.elements = elements;
	}

	updateUI({ message, status, data, stats }) {
		const resultDiv = document.getElementById("exportResult");
		const actionsDiv = document.getElementById("exportActions");
		if (!resultDiv) return;

		resultDiv.innerHTML = "";

		if (status === "success" && data) {
			if (actionsDiv) {
				actionsDiv.style.display = "flex";
			}

			const statsHtml = `
				<div class="stats-summary">
					<h3>Processing Summary</h3>
					<div class="stats-grid">
						<div class="stat-item">
							<span class="stat-label">Total images:</span>
							<span class="stat-value">${stats.total}</span>
						</div>
						<div class="stat-item">
							<span class="stat-label">Successfully processed:</span>
							<span class="stat-value ${stats.successful === stats.total ? "success" : ""}">${
				stats.successful
			}</span>
						</div>
						<div class="stat-item">
							<span class="stat-label">Failed:</span>
							<span class="stat-value ${stats.failed > 0 ? "error" : ""}">${
				stats.failed
			}</span>
						</div>
					</div>
				</div>
			`;

			const tableHtml = data.results
				? `
				<div class="results-table-wrapper">
					<table class="results-table">
						<thead>
							<tr>
								<th>Learning Object</th>
								<th>Status</th>
								<th>Images</th>
								<th>Success Rate</th>
							</tr>
						</thead>
						<tbody>
							${data.results
								.map(
									(lo) => `
								<tr>
									<td class="lo-name">${lo.name}</td>
									<td class="status ${lo.success ? "success" : "error"}">
										${lo.success ? "✓ Success" : "✗ Failed"}
									</td>
									<td class="image-count">${lo.stats.total}</td>
									<td class="success-rate">
										${Math.round((lo.stats.successful / lo.stats.total) * 100)}%
									</td>
								</tr>
							`
								)
								.join("")}
						</tbody>
					</table>
				</div>
			`
				: "";

			resultDiv.innerHTML = `${statsHtml}${tableHtml}`;
		} else {
			if (actionsDiv) {
				actionsDiv.style.display = "none";
			}
		}
	}

	showError(message) {
		this.updateUI({
			message,
			status: "error",
		});
	}
}
