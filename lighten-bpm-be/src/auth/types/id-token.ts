export interface IdToken {
  sub: string;
  code?: string;
  name: string;
  email: string;
  [key: string]: any;
}
