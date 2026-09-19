import type { AddressInfo } from "net";

import { createServer } from "net";

/**
 * Returns the preferred port if it can be bound on 127.0.0.1, otherwise a port the OS hands out. Windows reserves
 * ranges for Hyper-V and WinNAT that `netstat` does not show, so a fixed port cannot be relied on.
 */
export function findFreePort(preferred: number): Promise<number> {
	return tryListen(preferred).catch(() => tryListen(0));
}

function tryListen(port: number): Promise<number> {
	return new Promise((resolve, reject) => {
		const probe = createServer();
		probe.once("error", reject);
		probe.listen(port, "127.0.0.1", () => {
			const { port: bound } = probe.address() as AddressInfo;
			probe.close(() => resolve(bound));
		});
	});
}
