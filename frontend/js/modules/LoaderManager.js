export class LoaderManager {
	constructor() {
		this.loader = document.getElementById("futuristic-loader");
		this.mainContent = document.getElementById("main-content");
		this.loadingText = this.loader.querySelector(".loading-text");
	}

	show() {
		this.loader.classList.remove("error");
		this.loader.classList.add("active");
		// Reset progress bar
		const progressBar = this.loader.querySelector(".progress");
		if (progressBar) {
			progressBar.style.width = "0%";
			progressBar.style.transition = "none";
			progressBar.offsetHeight;
			progressBar.style.transition = "width 3s linear";
			progressBar.style.width = "100%";
		}
	}

	showError(message) {
		// Wait for current animations to finish
		setTimeout(() => {
			// Add error class to change styles
			this.loader.classList.add("error");

			// Update loading text to show error
			this.loadingText.innerHTML = `
				<span>E</span>
				<span>R</span>
				<span>R</span>
				<span>O</span>
				<span>R</span>
				<span>:</span>
				<span>&nbsp;</span>
				${message
					.split("")
					.map((char) =>
						char === " " ? "<span>&nbsp;</span>" : `<span>${char}</span>`
					)
					.join("")}
			`;

			// Stop progress bar animation
			const progressBar = this.loader.querySelector(".progress");
			if (progressBar) {
				progressBar.style.transition = "none";
				progressBar.style.width = "100%";
			}
		}, 0); // Wait for initial loading animation to complete
	}

	hide() {
		// Don't hide if in error state
		if (this.loader.classList.contains("error")) {
			return Promise.resolve();
		}

		return new Promise((resolve) => {
			setTimeout(() => {
				this.loader.classList.remove("active");
				const progressBar = this.loader.querySelector(".progress");
				if (progressBar) {
					progressBar.style.width = "0%";
				}
				setTimeout(() => {
					this.mainContent.classList.add("visible");
					resolve();
				}, 300);
			}, 2700);
		});
	}
}
