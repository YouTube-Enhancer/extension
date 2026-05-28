import { spawn } from "child_process";

async function runBuilds(): Promise<void> {
	console.log("[Build] Starting full build process...");
	const totalStart = Date.now();
	const steps = [
		{ command: "npm run build:pre", name: "build:pre" },
		{ command: "npm run build:run-builds", name: "build:main+client" },
		{ command: "npm run build:post-pipeline", name: "build:post-pipeline" },
		{ command: "npm run build:post", name: "build:post" }
	];
	for (const step of steps) {
		const stepStart = Date.now();
		console.log(`[Build] Starting step: ${step.name}`);
		let result: number;
		if (step.name === "build:main+client") {
			console.log(`[Build] Starting parallel builds: build:main and build:client`);
			const parallelStart = Date.now();
			const [mainResult, clientResult] = await Promise.all([
				runCommand("npm run build:main", { log: false }),
				runCommand("npm run build:client", { log: false })
			]);
			const parallelElapsed = ((Date.now() - parallelStart) / 1000).toFixed(2);
			console.log(`[Build] All parallel builds completed in ${parallelElapsed}s total`);
			result = mainResult === 0 && clientResult === 0 ? 0 : 1;
		} else {
			result = await runCommand(step.command);
		}
		const stepElapsed = ((Date.now() - stepStart) / 1000).toFixed(2);
		console.log(`[Build] Step "${step.name}" completed in ${stepElapsed}s`);
		if (result !== 0) {
			console.error(`[Build] Step "${step.name}" failed with exit code ${result}`);
			process.exit(1);
		}
	}

	const totalElapsed = ((Date.now() - totalStart) / 1000).toFixed(2);
	console.log(`[Build] Full build completed in ${totalElapsed}s total`);
}

async function runCommand(command: string, options: { log?: boolean } = {}): Promise<number> {
	const { log = true } = options;
	if (log) console.log(`[Build] Starting command: ${command}`);
	const start = Date.now();
	return new Promise((resolve, reject) => {
		const child = spawn(command, {
			shell: true,
			stdio: "inherit"
		});
		child.on("close", (code: number) => {
			const elapsed = ((Date.now() - start) / 1000).toFixed(2);
			if (log) console.log(`[Build] Command completed in ${elapsed}s: ${command}`);
			resolve(code);
		});
		child.on("error", (err: Error) => {
			if (log) console.error(`[Build] Failed to start command: ${command}`, err);
			reject(err);
		});
	});
}

runBuilds().catch((err: Error) => {
	console.error("[Build] Build failed:", err);
	process.exit(1);
});

export { runBuilds };
