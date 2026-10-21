export const DEVNET_GENESIS='EtWTRABZaYq6iMfeYKouRu166VU2xqa1';
export const MEMO_PROGRAM='MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr';
export type CheckoutOrder={id:string;intent:string;payer:string;destination:string;priceLamports:bigint;createdAt:Date;expiresAt:Date};
export type Verification={status:'PENDING'|'FAILED'|'VERIFIED';slot?:number};
export interface DevnetRpc {getGenesisHash():Promise<string>;getSignatureStatuses(signatures:string[],options:any):Promise<any>;getParsedTransaction(signature:string,options:any):Promise<any>}
export async function verifyDevnet(rpc:DevnetRpc,signature:string,order:CheckoutOrder):Promise<Verification>{
 if(await rpc.getGenesisHash()!==DEVNET_GENESIS)throw new Error('RPC is not Solana Devnet. No fallback is permitted.');
 const state=(await rpc.getSignatureStatuses([signature],{searchTransactionHistory:true})).value[0];
 if(state?.err)return {status:'FAILED'};
 if(!state||state.confirmationStatus!=='finalized')return {status:'PENDING'};
 const tx=await rpc.getParsedTransaction(signature,{commitment:'finalized',maxSupportedTransactionVersion:0});
 if(!tx)return {status:'PENDING'};if(!tx.meta||tx.meta.err)return {status:'FAILED'};
 if(tx.transaction.signatures[0]!==signature)throw new Error('Signature mismatch');
 const keys=tx.transaction.message.accountKeys;
 if(keys[0]?.pubkey.toString()!==order.payer||!keys[0]?.signer||keys.filter((k:any)=>k.signer).length!==1)throw new Error('Wrong payer');
 if(!tx.blockTime)return {status:'PENDING'};
 const timestamp=tx.blockTime*1000;if(timestamp<order.createdAt.getTime()-90000||timestamp>order.expiresAt.getTime())throw new Error('Transaction outside order window');
 const instructions=tx.transaction.message.instructions;
 if(instructions.length!==2)throw new Error('Expected exactly one transfer and one order memo');
 const transfer=instructions[0],memo=instructions[1];
 if(transfer.programId.toString()!=='11111111111111111111111111111111'||transfer.parsed?.type!=='transfer')throw new Error('Invalid transfer instruction');
 const info=transfer.parsed.info;
 if(info.source!==order.payer||info.destination!==order.destination)throw new Error('Wrong payer or recipient');
 if(!Number.isSafeInteger(info.lamports)||BigInt(info.lamports)!==order.priceLamports)throw new Error('Wrong amount');
 if(memo.programId.toString()!==MEMO_PROGRAM||memo.parsed!==`ABYSS:${order.id}:${order.intent}`)throw new Error('Transaction belongs to another order');
 return {status:'VERIFIED',slot:tx.slot};
}
