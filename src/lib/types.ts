export interface DOMUser {
  id: string;
  name: string;
  avatar_url?: string;
  bio?: string;
}

export interface UserInfo {
  name: string;
  avatar?: Uint8Array;
  bio?: string;
}
