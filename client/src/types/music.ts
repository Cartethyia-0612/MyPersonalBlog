export interface MusicPlaylistSummary {
  id: number
  name: string
}

export interface MusicTrack {
  id: string
  name: string
  artist: string
  url: string
  cover: string
  lrc: string
}

export interface MusicPlaylistResponse {
  playlist: MusicPlaylistSummary
  tracks: MusicTrack[]
}

export interface AdminMusicPlaylist {
  id: number
  name: string
  server: string
  playlistId: string
  sortOrder: number
  visible: boolean
  createdAt: string
  updatedAt: string
}

export interface MusicPlaylistInput {
  name: string
  server: string
  playlistId: string
  sortOrder: number
  visible: boolean
}
