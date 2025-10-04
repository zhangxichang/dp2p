export interface AccountData {
    id: string
    name: string
    key: string
    avatar?: Uint8Array
}

export interface UserData {
    id: string
    name: string
    avatar?: Uint8Array
}

export interface DOMUser {
    id: string
    name: string
    avatar_base64_url?: string
}
export const DOMUser = {
    async from(value: UserData | AccountData) {
        return {
            id: value.id,
            name: value.name,
            avatar_base64_url: value.avatar && await new Promise<string>((resolve, reject) => {
                const file_reader = new FileReader()
                file_reader.onload = (e) => resolve(e.target?.result as string)
                file_reader.onerror = (e) => reject(e.target?.error)
                file_reader.readAsDataURL(new Blob([Uint8Array.from(value.avatar!)]))
            })
        } as DOMUser
    }
}
