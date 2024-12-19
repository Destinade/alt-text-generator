export class UIStateManager {
	constructor(elements) {
		this.elements = elements;
	}

	updateUI({ message, status, data, stats }) {
		const resultDiv = document.getElementById("exportResult");
		const actionsDiv = document.getElementById("exportActions");
		if (!resultDiv) return;

		resultDiv.innerHTML = "";

		if (status === "loading") {
			resultDiv.innerHTML = `
				<div class="results-loading active">
					<div class="lo-loading-spinner"></div>
					<div class="loading-text">Processing...</div>
				</div>
			`;
			if (actionsDiv) {
				actionsDiv.style.display = "none";
			}
			return;
		}

		if (status === "success" && data) {
			if (actionsDiv) {
				actionsDiv.style.display = "flex";
			}

			const aggregatedStats = data.results.reduce(
				(acc, lo) => ({
					total: acc.total + lo.stats.total,
					successful: acc.successful + lo.stats.successful,
					failed: acc.failed + lo.stats.failed,
				}),
				{ total: 0, successful: 0, failed: 0 }
			);

			const statsHtml = `
				<div class="stats-summary">
					<h3>Processing Summary</h3>
					<div class="stats-grid">
						<div class="stat-item">
							<span class="stat-label">Total images:</span>
							<span class="stat-value">${aggregatedStats.total}</span>
						</div>
						<div class="stat-item">
							<span class="stat-label">Successfully processed:</span>
							<span class="stat-value ${
								aggregatedStats.successful === aggregatedStats.total
									? "success"
									: ""
							}">${aggregatedStats.successful}</span>
						</div>
						<div class="stat-item">
							<span class="stat-label">Failed:</span>
							<span class="stat-value ${aggregatedStats.failed > 0 ? "error" : ""}">${
				aggregatedStats.failed
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
								<th>Generation Status</th>
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
									<td class="generation-status">
										${lo.images.map((img) => (img.altText.startsWith("[") ? "❌" : "✓")).join(", ")}
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
