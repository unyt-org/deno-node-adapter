import { ClientComEndpoint, ComEndpoint, ServerComEndpoint } from "./com_endpoint.ts";
import type { exports, awaitedExports, RequestMessage, ResponseMessage } from "./types.d.ts";
import WebSocket, { WebSocketServer } from 'ws';
import * as cp from "child_process";
import { Bridge } from "./bridge.ts";

declare const process:any;


class NodeClient extends ClientComEndpoint {

	#client?: WebSocket

	protected handleInit(): void|Promise<void> {
		console.debug("init node client, connecting to port " + this.port)
		this.#client = new WebSocket(this.endpoint);
		this.#client.on("message", (data:string) => this.handleMessage(<RequestMessage|ResponseMessage> JSON.parse(data)));
		this.#client.on("error", (data:string) => this.handleError(data));
	}

	protected awaitConnection() {
		return new Promise<void>(resolve => {
			this.#client!.on("open", () => resolve());
		})			
	}

	close() {
		return this.#client.close();
	}

	protected onSend(data: RequestMessage|ResponseMessage): void {
		this.#client!.send(JSON.stringify(data));
	}

}

class NodeServer extends ServerComEndpoint {

	#server?: WebSocketServer;
	#client?: WebSocket;

	public handleInit() {
		this.#server = new WebSocketServer({port: this.port});
		this.port = this.#server.address().port
		console.debug("running node server " + this.endpoint)
	}

	public awaitConnection() {
		return new Promise<void>(resolve => {
			this.#server!.on('connection', (ws:any) => {
				this.#client = ws;
				ws.on('error', (e:any) => this.handleError(e));
				ws.on('message', (data:string) => this.handleMessage(JSON.parse(data)));
				resolve();
			});
		})
	}

	close() {
		return this.#server.close();
	}

	protected onSend(data: RequestMessage|ResponseMessage) {
		this.#client?.send(JSON.stringify(data));
	}

	protected spawnOtherProcess(path: URL, cmd:string[]) {
		console.debug("spawning deno process: " + path.pathname);
		const deno = cp.spawn(cmd[0], [...cmd.slice(1), path.pathname, this.port.toString()], {stdio: "inherit"});
		// const decoder = new TextDecoder();
		// deno.stdout.on('data', function (data:any) {
		// 	console.log(decoder.decode(data).replace(/\n$/,''));
		// });
		// deno.stderr.on('data', function (data:any) {
		// 	console.error(decoder.decode(data).replace(/\n$/,''));
		// });
		return new Promise<{code:number, success:boolean}>(resolve=>{
			deno.on('exit', function (code:any) {
				resolve({success:code==0, code})
			});
		})
	}

}


class DenoBridge extends Bridge {

	clientClass = NodeClient;
	serverClass = NodeServer

	spawnCommand = ['deno', 'run', '-Aq']

	protected getExistingPort() {
		if (process.argv[2]) return Number(process.argv[2])
	}

	exitProcess(status:number) {
		process.exit(status);
	}

}


export const denoBridge = new DenoBridge();
export const importFromDeno = denoBridge.import.bind(denoBridge);
