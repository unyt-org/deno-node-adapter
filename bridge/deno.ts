import { StandardWebSocketClient, WebSocketClient, WebSocketServer } from "https://deno.land/x/websocket@v0.1.4/mod.ts";
import { ClientComEndpoint, ServerComEndpoint } from "./com_endpoint.ts";
import type { RequestMessage, ResponseMessage } from "./types.d.ts";
import { getAvailablePort } from "https://deno.land/x/port@1.0.0/mod.ts"
import { Bridge } from "./bridge.ts";


class DenoClient extends ClientComEndpoint {
	#client?: WebSocketClient;

	public handleInit() {
		this.#client = new StandardWebSocketClient(this.endpoint);
		this.#client.on("message", (event:MessageEvent) => this.handleMessage(<RequestMessage|ResponseMessage> JSON.parse(event.data)));
		this.#client.on("error", () => this.handleError("deno websocket client error"));
	}

	protected awaitConnection() {
		return new Promise<void>(resolve => {
			this.#client?.on("open", () => resolve());
		})
	}

	close() {
		return this.#client?.close(0);
	}

	protected onSend(data: RequestMessage|ResponseMessage) {
		this.#client?.send(JSON.stringify(data));
	}
}


class DenoServer extends ServerComEndpoint {

	#server?: WebSocketServer
	#client?: WebSocketClient

	public async handleInit() {
		if (!this.port) this.port = await this.getNewPort();
		console.debug("running deno server " + this.endpoint)
		this.#server = new WebSocketServer(this.port);
		this.#server.on("error", () => this.handleError("deno websocket server error"));
	}

	private async getNewPort(){
		const port = await getAvailablePort();
		if (port == undefined) throw new Error("No available port found");
		return port;
	}

	protected awaitConnection(): void|Promise<void> {
		return new Promise<void>(resolve => {
			this.#server?.on("connection", ws => {
				this.#client = ws;
				this.#client.on("message", (data:string) => {
					this.handleMessage(<RequestMessage|ResponseMessage> JSON.parse(data))
				});
				resolve();
			})
		})
	}

	close() {
		return this.#server?.close();
	}

	protected onSend(data: RequestMessage|ResponseMessage) {
		this.#client?.send(JSON.stringify(data));
	}

	protected async spawnOtherProcess(path: URL, cmd:string[]) {
		console.debug("spawning node process: " + path.pathname);
		const status = await Deno.run({cmd: [...cmd, path.pathname, this.port.toString()]}).status()
		return status;
	}

}



class NodeBridge extends Bridge {

	clientClass = DenoClient;
	serverClass = DenoServer

	spawnCommand = ["ts-node", "-T", "--esm"]

	protected getExistingPort() {
		if (Deno.args[0]) return Number(Deno.args[0])
	}

	exitProcess(status:number) {
		Deno.exit(status);
	}
}

export const nodeBridge = new NodeBridge();
export const importFromNode = nodeBridge.import.bind(nodeBridge);