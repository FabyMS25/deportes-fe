 export interface PassResets{
  uuid?: String;
  estado?:boolean;

  email:String;
  token:string;  
  expriresAt:Date;
}
