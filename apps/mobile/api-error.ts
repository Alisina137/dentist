/** A typed native API failure, safe to map without reflecting server diagnostics. */
export class ApiError extends Error{
 constructor(public status:number,public code:string){super(code);}
}
