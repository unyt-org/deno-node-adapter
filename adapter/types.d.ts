export interface RequestMessage {
	name: string,
	data: unknown[],
	id?: number
}

export interface ResponseMessage<T = any> {
	rid: number,
	result: T
}


export type exports = {[name:string]: (...args:any[])=>any}
export type awaitedExports<T extends exports> = {[K in keyof T]: ((...args:Parameters<T[K]>)=>Promise<ReturnType<T[K]>>)} 