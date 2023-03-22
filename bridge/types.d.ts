export type primitive = number|string|undefined|boolean|null|void
export type json = primitive|json[]|{[key:string]:json}

export interface RequestMessage {
	type?: "internal",
	name: string,
	data: json[],
	id?: number
}

export interface ResponseMessage<R = any, E = any> {
	rid: number,
	error?: E,
	result?: R
}

export type exports = {[name:string]: (...args:any[])=>json}
export type awaitedExports<T extends exports> = {[K in keyof T]: ((...args:Parameters<T[K]>)=>Promise<ReturnType<T[K]>>)} 