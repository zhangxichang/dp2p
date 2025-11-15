export interface PK {
  pk: number;
}
export interface ID {
  id: string;
}
export interface Text {
  text: string;
}
export interface FileMetadata {
  hash: string;
}

export interface Person {
  name: string;
  avatar?: Uint8Array;
  bio: string;
}

export interface FriendMessage {
  is_sent: boolean;
  text: string;
}

export type PersonData = Omit<Person, "avatar"> & {
  avatar_file_pk?: number;
};
export type DOMPerson = Omit<PersonData, "avatar_file_pk"> & {
  avatar_url?: string;
};
