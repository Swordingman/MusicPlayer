export interface Song {
        id: number;
        title: string;
        artist: string;
        src: string;
        coverImgUrl: string;
		localPath?: string;
}