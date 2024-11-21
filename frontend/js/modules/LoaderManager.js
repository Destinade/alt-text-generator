export class LoaderManager {
	constructor() {
		this.loader = document.getElementById("futuristic-loader");
		this.mainContent = document.getElementById("main-content");
	}

	show() {
		this.loader.classList.add("active");
	}

	hide() {
		return new Promise((resolve) => {
			setTimeout(() => {
				this.loader.classList.remove("active");
				setTimeout(() => {
					this.loader.style.display = "none";
					this.mainContent.classList.add("visible");
					resolve();
				}, 600);
			}, 3000);
		});
	}
}
